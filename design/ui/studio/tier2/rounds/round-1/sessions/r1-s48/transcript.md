# Session r1-s48 -- Grace (returning), task T23 dataset B (Florentine families)

Build: frozen build 946256efb876 (`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`).

Task as given: which families are at most two marriages away from the Medici (a family they married
into, or a family that married into one of those)? How many, not counting the Medici? Then change
the drawing so it has only the Medici and those families.

## Steps

### Start
Command: `REAL_DIST=... tool/with-browser.sh node tool/real.mjs --start rounds/round-1/sessions/r1-s48 setup:florentine-ranked.txt`
Screenshot 01.png. Grace: "Okay, the Florentine families map is open, 15 in the PageRank row, colored
and sized already. No names on the dots though, so I can't tell which one is the Medici. First I'll
type Medici in the find box on the left, that's how I looked up one person last time."

### Step 1
Command: `--step --click "Find nodes, edges, values" --type "Medici"` -> 02.png
Grace: "Good, it finds Medici: 1 node, and 6 edges -- Acciaiuoli, Barbadori, Ridolfi, Tornabuoni,
Albizzi, Salviati. So six families married straight into the Medici. Writing those down. Now I need
the next ring out. I'll click the Medici result to select it and see what the right side tells me."

### Step 2
Command: `--step --click-at 116,153` (the Medici result) -> 03.png
Grace: "Medici is highlighted in yellow, the big one in the middle, Selection says 1. Right side:
Degree 6, which matches my six. There's a little three-dot menu up top on the right; maybe it has
something like 'pick everyone connected'. I'll open it."

### Step 3
Command: `--step --click-at 1419,74` ("Node actions") -> 04.png
Grace: "A menu: Neighborhood, Path between..., Frame selection, Add note. 'Neighborhood' -- like the
people who live around this family? That's the closest thing to what I want. Trying it."

### Step 4
Command: `--step --click "Neighborhood"` -> 05.png
Grace: "Now it says 'Medici's 6 connections', lists the same six names, Selection went to 7 (Medici
plus six -- that adds up). There's a 'Hops' row with 1, 2, 3. 'Hops' is an odd word, I wouldn't put it
on a slide, but 1 is picked and that gave me one marriage away, so 2 should be two marriages away.
Clicking 2."

### Step 5
Command: `--step --click-at 1350,178` (Hops "2") -> 06.png
Grace: "'Medici's 11 connections within 2 hops.' Let me count the list: Acciaiuoli, Albizzi,
Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni -- eleven
names, and Selection on the left says 12, which is the eleven plus the Medici. So my answer is 11.
Only bump: it says 'connections', and to me a connection is a marriage, not a family -- but the list
is clearly families, so I'll take it. Three dots on the drawing are not lit up. Now the second half:
'Filter to neighbors' looks like the button that leaves only these. Clicking it."

### Step 6
Command: `--step --click "Filter to neighbors"` -> 07.png
Grace: "The button turned blue, and up top it now says '12 of 15 nodes' with a little funnel. Counting
dots on the drawing: twelve, all lit yellow, the three unlit ones are gone. That's the Medici plus
eleven. Done, I think. One thing caught my eye: the little chart icon next to PageRank on the left
turned into a clock-with-arrow icon. Did my ranking just go stale? Let me hover it before I trust it."

### Step 7
Command: `--step --hover-at 81,156` -> 08.png. Tool printed: treeitem "PageRank, out of date",
tooltip "Ran on 15 nodes; 12 shown now".
Grace: "Okay, it's only telling me the ranking was worked out on all 15 and I'm showing 12 now. That's
fair -- it didn't silently change my numbers, it told me. I don't need a new ranking for this
question. I'm done: 11 families, and the drawing shows only the Medici and those 11."

### End
Command: `--end rounds/round-1/sessions/r1-s48`

## Wrap-up (in character)

- **Finished?** Yes. Answer: 11 families, not counting the Medici (Acciaiuoli, Albizzi, Barbadori,
  Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). The drawing is
  narrowed to those 11 plus the Medici; the top bar reads "12 of 15 nodes" and I counted 12 dots.
- **Ease:** 6 of 7. Six clicks, no dead ends.
- **What confused me:**
  - Nothing on the drawing has a name, so I could not find the Medici by looking; I had to type it
    into the find box. Fine for me, but I would never have known which big dot was which otherwise.
  - "Neighborhood" was a guess. It was the only menu item that sounded close; nothing said
    "families married into" or "people a step away". It was tucked in the three-dot menu on the
    right after I had selected the Medici -- I only found it because I went looking in the menu.
  - "Hops" is a word I would not use and would not put on a slide. I worked out from 1 = six names
    that 2 means two marriages away.
  - The heading says "11 connections" but lists families. To me a connection is a marriage (the
    Medici have 6 of those), so "11 connections" made me stop and count to be sure it meant 11
    families.
  - "Filter to neighbors" -- clear enough once I was there, but again "neighbors".
  - After narrowing, the PageRank icon on the left changed to a clock; the tooltip "Ran on 15 nodes;
    12 shown now" explained it. Reassuring rather than confusing, but I only knew because I hovered.
  - When that tooltip was open it covered the Notes button on the left rail (noticed in passing).
