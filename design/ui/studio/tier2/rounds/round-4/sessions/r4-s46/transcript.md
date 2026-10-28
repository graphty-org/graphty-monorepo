# Session r4-s46 -- Explorer Elena, returning user

Task: Florentine families are open. How many families are at most two marriages from the Medici (not counting the Medici)? Then change the drawing to show only the Medici and those families.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s46
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

## Steps

### 01 -- start
`node design/ui/studio/tool/real.mjs --start .../r4-s46 setup:florentine-ranked.txt` -> 01.png
The families picture is open, orange dots of different sizes, PageRank in a list on the left. No names on the dots. I remember the find box. I'll type Medici there.

### 02
`--step <session> --click "Find nodes, edges, values" --type "Medici"` -> 02.png
The find box shows Medici and 6 lines: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. So six families married in directly. Now I need the families those six married. I'll click the Medici row to jump to it and see its list on the right.

### 03
`--step <session> --click "Medici"` -> 03.png (refused: "Medici" matched 7 rows, nothing happened)

### 04
`--step <session> --click "Medici#1"` -> 04.png
The big dark dot in the middle lit up yellow; the right side says Medici, Degree 6, PageRank #1 of 15. I want to grab its neighbors and their neighbors. There's a "..." up by the name -- maybe there's a "select connected" in there.

### 05
`--step <session> --click-at 1419,73` -> 05.png
A small menu: Neighborhood, Path between..., Frame selection, Add note. "Neighborhood" sounds like exactly the families around Medici. Clicking it.

### 06
`--step <session> --click "Neighborhood"` -> 06.png
Oh nice -- "Medici and 6 connections", the six names listed, and a "Hops 1 2 3" switch. Two marriages away must be 2 hops. Clicking 2.

### 07
`--step <session> --click-at 1349,178` (the "2" hop button) -> 07.png
"Medici and 11 connections" -- eleven names now: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. Selection on the left says 12, which is the 11 plus Medici, so that matches. Answer: 11. Three dots are not lit. Now "Filter to neighbors" should hide the rest.

### 08
`--step <session> --click "Filter to neighbors"` -> 08.png
The three unlit dots are gone; the top bar now says "12 of 15 nodes", and every dot left has the yellow ring. The button went grey, so I guess it's on. The PageRank legend now says "full graph" -- fine, I didn't touch that. That's it, I'm done.

### 09 -- end
`--end <session>` -> session ended.

## Wrap-up (in character)

- **Finished?** Yes. Answer: 11 families within two marriages of the Medici (Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). The drawing now shows only those 11 plus the Medici ("12 of 15 nodes").
- **Ease:** 6 of 7.
- **What confused me:**
  - I didn't remember where "show the connected ones" lived. The find box listed the six direct marriages but not the next ring, and the neighborhood option is tucked behind the little "..." next to the name -- I only found it by guessing.
  - Clicking "Medici" in the find list did nothing the first time because the marriage lines also contain the word Medici (a session tool refusal, not something the app showed me; as a person I'd have clicked the top row).
  - After "Filter to neighbors" the button went grey. I assume that means it's on, but nothing says so near it, and I'm not sure how to undo it besides the arrow at the top. The "12 of 15 nodes" at the top did reassure me.
  - The legend changed to "PageRank, full graph" -- I don't know what that means but I ignored it.
