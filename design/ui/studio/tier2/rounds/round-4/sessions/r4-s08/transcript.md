# Session r4-s08 -- Explorer Elena, returning user

Screenshots and session files: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s08 (real.mjs writes sessions there).

All commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s08.

## Start

`node design/ui/studio/tool/real.mjs --start $S setup:bus-stops-ranked-names.txt` -> 01.png

01.png: the bus map is open, orange balls with names. Station at the top, Stadium just below it, a short line between them. Harbor is a huge dark ball. Legend says PageRank. Right panel is "Everything", Style tab.

## Step 1
Thought: "That little line between Station and Stadium -- let me click it, like clicking a bar in our dashboard."
`--step $S --click-at 752,165` -> "at 752,165: node Stadium" -> 02.png
02.png: I got the Stadium ball instead of the line. Right panel: Stadium, Degree 3 with an arrow, PageRank #4 of 10. Selection says 1. No minutes here.

## Step 2
Thought: "Missed. Try the line a bit higher, nearer Station."
`--step $S --click-at 765,140` -> "edge with id 15" -> 03.png
03.png: the line is blue now. Right panel: "Station -> Stadium", Edge, From Station, To Stadium, minutes 4. So it takes 4 minutes. Easy. Selection still says 1 -- that's the line, not the two stops.

## Step 3
Thought: "Now point at the two stops. Click Station first, then add Stadium somehow."
`--step $S --click Station` -> 04.png
04.png: Station has a yellow glow, panel shows Station, PageRank #7 of 10. Selection 1.

## Step 4
Thought: "In Sheets I hold shift to add more. Try shift-click on Stadium."
`--step $S --shift-click Stadium` -> "clicked node Stadium on the canvas, at 726,221" -> 05.png
05.png: Station and Stadium both glow yellow. Panel header: "2 nodes selected", Nodes 2, "Edges joining these nodes 1". Selection in the left list says 2. Nothing else glows. That's what I wanted.

## End
`--end $S` -> "session ended", copied to design/ui/studio/tier2/rounds/round-4/sessions/r4-s08. No further request.

## In character, at the end
- Did I finish? Yes. The Station-Stadium link takes 4 minutes (the line's panel says "minutes 4"), and Station and Stadium are the only two picked ("2 nodes selected").
- Ease: 6 of 7.
- What confused me: my first click on the line grabbed the Stadium ball instead -- the line is short and sits right under the Stadium label, so I had to aim nearer Station. I was not sure shift-click would add rather than replace, since I'd never done that here before; I just tried it because that's how spreadsheets work. The panel said "Station -> Stadium" with an arrow, which made me wonder if the bus only goes one way, but it didn't matter for the question.
