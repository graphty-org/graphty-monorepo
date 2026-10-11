# Session r5-s04b -- Dana Okafor, supply chain risk analyst (returning user)

Task: on the open Les Miserables network (each tie = chapters two characters share), point out on the drawing every tie of 10 or more shared chapters, without taking anything off the drawing, and say how many there are.

Commands use:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s04b <step>

## Step 01 (arrived)
01.png: Les Miserables open, PageRank colors and sizes. Left: search box "Find nodes, edges, values", Selection, PageRank, Everything. Toolbar at bottom. Ties are thin grey lines. I need ties with 10+ chapters. First thing I try: the search box, like I search a supplier name.

## Step 02
Command: --click "Find nodes, edges, values"
02.png: box has focus, nothing drops down, no hint about what to type. I'll type "10" and see whether it shows ties with value 10.

## Step 03
Command: --type "10"
03.png: nice -- it lists two ties at exactly 10, and under Values: "shared_chapters is 10 or more (13)". That's my answer in words: 13. But the icon next to it looks like a filter funnel, and I must not take anything off the drawing. I'll hover it first to see what it does.

## Step 04
Command: --hover "shared_chapters is 10 or more (13)"
04.png: row highlights, no tooltip, drawing unchanged. No way to tell if it highlights or filters. There's an undo arrow at top, so I'll just click it and check whether anything vanishes.

## Step 05
Command: --click "shared_chapters is 10 or more (13)"
05.png: it selected them, it did not filter. "13 edges selected", the ties are drawn thick blue on the drawing, every character and grey tie is still there. Right panel lists all 13 with their chapter counts (10 to 31), and that table is the part I trust. That's the task done. Ending.

## Step 06
Command: --end (session ended cleanly, no further request)

## Wrap-up, in character (Dana)
- Finished: yes. 13 ties of 10 or more shared chapters, shown thick blue on the drawing, nothing taken off; listed with their values in the right panel (Cosette -- Valjean the strongest at 31).
- Ease: 6 of 7. Typing a number into the search box offered "shared_chapters is 10 or more (13)" -- I didn't have to know any rule syntax.
- What confused me: the suggestion rows carry a funnel icon, which to me means "filter, hide the rest", so I nearly didn't click it because I was told not to remove anything. Hovering gave no tooltip to say it would select rather than filter. It turned out to select; a one-line hint ("Select 13 edges") would have saved the hesitation. Also, "edges" is the tool's word -- I'd say ties or links -- but the table made it clear. The small grey sub-labels in the result list (shared_chapters: 10) are hard to read without my glasses.
- So what for my job: "show me every lane above a threshold, don't hide the rest" is exactly what I'd want for spend or volume on Tier 1 links. Still need to know if the selected list exports to Excel.
