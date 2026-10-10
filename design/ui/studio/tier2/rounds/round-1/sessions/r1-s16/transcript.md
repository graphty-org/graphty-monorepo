# Session r1-s16 -- Tom (returning), T17 prompt B (Les Miserables)

Build: frozen build 946256efb876, served from `.study-builds/tier2-r1d4-946256efb/`.
Commands run from `design/ui/studio/tier2`, with `R="REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ node ../tool/real.mjs"` and `S=rounds/round-1/sessions/r1-s16`.

## Start

First start failed: `$R --start $S setup:lesmis-ranked.txt` printed `SETUP FAILED`. The setup's
click on "PageRank" timed out after 3 seconds at Playwright's "done scrolling" stage, before
"performing click action", and every later setup step then missed ("nothing on screen is called
Run", "Add to Shape", "Size"). At that moment the machine's load average was 158 on 32 threads,
with about ten headless Chromium GPU processes (software rendering) each using 90 to 280 percent
CPU plus a vitest run in another worktree, so the page could not answer the click's hit-test
within the tool's 3-second limit. The failed attempt's files are kept in `failed-start-1/`.
The second start, a few seconds later, succeeded.

Second start: `$R --start $S setup:lesmis-ranked.txt` -> 01.png. Les Miserables, orange dots sized and
colored by PageRank, a PageRank row in the left list (77), a legend top left.

## Steps

### 1 -> 02.png
Tom: "There's the lab map, er, the Les Miserables one, orange dots like last time. I need only the
pairs with 5 or more chapters. The only button I know is the flask one, the analysis button. I'll try that."
`$R --step $S --click-at 679,864` (button "Analyze"). A list opened: Recent PageRank, then "Rank nodes and
edges": Degree, Betweenness, Closeness, Katz, HITS... and a box "Filter analyses" at the top.

### 2
Tom: "These are all those algorithm names. I'm not learning those. There's a box at the top though; I'll
type what I want, 'chapters', and see if anything comes up."
`$R --step $S --type "chapters"` -> 03.png: "No analysis matches 'chapters'".

### 3
Tom: "Nothing. So it's not in the analysis button. Close this. There's another button next to the flask,
the one with the little chart and dots. I don't know it; I'll point at it and see what it's called."
`$R --step $S --key Escape` -> 04.png: Escape emptied the box but the list stayed open.
`$R --step $S --hover-at 728,864` -> 05.png: the other button is "Layout". The analysis list is still open behind it.

### 4
Tom: "Layout. That's how it's arranged; not what I want. And this list won't go away. I'll click on the
blank part of the picture to get rid of it."
`$R --step $S --click-at 1100,700` (empty canvas) -> 06.png: the analysis list is STILL open. Clicking the
picture did not close it; the flask button no longer looks pressed, but the list stays.

### 5
Tom: "It's stuck there. I'll try the Escape key again."
`$R --step $S --key Escape` -> 07.png: still open. Focus moved to the picture (it has an outline now) but the
list stays on top of it.

### 6
Tom: "Still there. Maybe pressing the flask again closes it, like a switch."
`$R --step $S --click-at 679,864` -> 08.png: the list closed. Only pressing the flask a second time closed it.

### 7
Tom: "Finally. Right, the box at the top left says 'Find nodes, edges, values'. The chapters are a value on the
ties, I suppose. I'll click in there."
`$R --step $S --click "Find nodes, edges, values"` -> 09.png: the box is active, nothing else changed.

### 8
Tom: "Nothing pops up. I'll type 'chapters' here and see what it finds."
`$R --step $S --type "chapters"` -> 10.png: "No match for 'chapters'". The picture is unchanged.

### 9 -- stop
Tom: "No match. That's twice now: the analysis button didn't know it and the find box doesn't either. Nobody
showed me this one and I can't see where it would be. I'll ask her to just send me a PNG with only the
strong pairs on it."
`$R --end $S`

## Debrief (in character)

- **Finished?** No. I never found a way to make the drawing show only the pairs with 5 or more chapters,
  so I can't say how many characters are left, and there was nothing to bring back. The follow-up was not
  reached.
- **Ease:** 2 out of 7.
- **What confused me:**
  - I only know the flask button. It is a list of ranking names (Degree, Betweenness, Katz, HITS...). I
    typed "chapters" in its box and it said no analysis matches. Nothing told me where else to look.
  - That list would not go away. Escape only emptied the box; clicking the picture didn't close it;
    Escape again didn't close it. Only pressing the flask a second time did. I thought I had broken it.
  - The box at the top left says "Find nodes, edges, values", so I thought the chapter counts would be
    in there. It said "No match for 'chapters'". I don't know if the chapters number is even in this file,
    or what it is called in here.
  - Nothing on the screen says "ties" or "chapters" anywhere, so I had no word to go looking for.

## Observations for the team (not Tom's words)

- Implementation defect, not a UX question: the Analyze popover does not close on a click on the
  canvas (06.png) or on Escape with an empty search box while focus is on the canvas (07.png); only a
  second press of the Analyze button closes it (08.png). The first Escape only clears the search text
  (04.png).
- Setup reliability: the first start failed in the setup's own "PageRank" click under a load average of
  about 158 (ten software-rendering headless Chromium GPU processes and a vitest run elsewhere); the tool's
  3-second click limit expired while the page was starved. Details under "Start".
- Neither search box (Analyze's "Filter analyses", the left "Find nodes, edges, values") recognizes the
  task's words ("chapters"), so a participant who does not already know where narrowing the drawing lives
  has no route to it from search.
