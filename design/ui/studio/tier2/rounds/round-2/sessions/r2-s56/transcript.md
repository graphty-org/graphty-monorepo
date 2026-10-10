# Session r2-s56 -- Ruth (returning), task T12R, dataset B (Florentine families)

Build: 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)

Prompt: "You have used this program a few times. The ready-made network of the leading families of
Renaissance Florence and the marriages between them is already open. Go to the Medici family, read
what the program knows about them, and see which families they married into. Tell us who they are
and how many."

## Steps

### 01 -- start
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s56 setup:florentine-ranked.txt`

I see the Florentine families network, colored and sized by PageRank, with a PageRank run on the
right. No names on the dots. Left side has the find box I used before ("Find nodes, edges, values").
Next: click the find box and type Medici, as I always do.

### 02 -- find Medici
Command: `--step <s> --click "Find nodes, edges, values" --type "Medici"`

The find box lists "Nodes 1: Medici" and "Edges 6": Acciaiuoli, Barbadori, Ridolfi, Tornabuoni,
Albizzi, Salviati, each as "Medici -- X". That already reads like an answer, but those are matches
for the word Medici, not necessarily the program's list of who they are tied to. Next: click the
Medici node row to jump to it and read the right-hand panel, as I did before.

### 03 -- select Medici
Command: `--step <s> --click-at 116,153` (option "Medici")

Medici is highlighted on the map (the big dark dot in the middle). Right panel: id Medici, name
Medici, Degree 6 with a little arrow, and Results: PageRank 0.1458, #1 of 15. Degree 6 is a count of
connections -- my class taught me that. But I don't see the list of connections I used to read here.
The arrow next to Degree looks like it opens something. Next: click Degree.

### 04 -- open Degree
Command: `--step <s> --click "Degree"`

There it is: "Medici and 6 connections", Hops 1 / 2 / 3 (1 chosen), a "Filter to neighbors" button,
and the names: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Six names, matching
Degree 6 and the six "Medici -- X" edges the find box gave me. The map rings those six plus Medici,
and the Selection count on the left jumped from 1 to 7 -- I did not ask to select anything, I only
opened the list; harmless here, but I noticed it. Hops is new to me; 1 is what I want (direct
marriages). Next: check one link -- click Ridolfi and see whether its panel lists Medici back.

### 05 -- jump to Ridolfi
Command: `--step <s> --click "Ridolfi"`

The panel is now Ridolfi: Degree 3, PageRank 0.06957, #6 of 15. The map rings one dot, left of the
Medici dot, joined to it by a line. Selection is back to 1. Next: open Ridolfi's Degree to read its
three names and see whether Medici is one of them.

### 06 -- Ridolfi's connections
Command: `--step <s> --click "Degree"`

"Ridolfi and 3 connections": Medici, Strozzi, Tornabuoni. Medici is there, so the Medici--Ridolfi
marriage holds from both sides. Tornabuoni also appears in both lists, which fits the map. That is
my check done.

### end
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s56`

## Outcome (Ruth, in her own words)

**Finished: yes.** The Medici married into six families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
Salviati and Tornabuoni. Six -- the panel says Degree 6, the list says "Medici and 6 connections",
and the find box showed six "Medici -- X" ties. Three places agree, so I'd print it. I checked one
link (Ridolfi) and it lists Medici back. What the program knows about them: id and name Medici,
Degree 6, and PageRank 0.1458, ranked #1 of 15.

**Ease: 6 of 7.**

**What confused me:**
- The list of connections I used to read straight off the right-hand panel is now one click in,
  behind the arrow next to Degree. I found it because the arrow was the only thing to press, but
  nothing said "connections" until I pressed it.
- Opening that list quietly changed my Selection from 1 to 7 on the left. I only wanted to read
  names; I didn't ask to select anyone. If I'd been about to do something to "the selection" I'd
  have been surprised.
- "Hops 1 2 3" and "Filter to neighbors" are new. I left Hops at 1 and didn't touch the filter; it
  didn't get in my way, but the panel didn't say what a hop is.
- PageRank "#1 of 15" -- I know from last time it came from the ranking run, but the panel doesn't
  say over what it counted. Not needed for this question.
