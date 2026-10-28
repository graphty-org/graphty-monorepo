# Session r5-s26b -- Dev, returning

Build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/
Session folder: tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s26b

## 01.png (start)
Okay, bus-stops is open, all ten names are on. I can see Station at the top and Stadium just under it, with a short gray line between them. I need the minutes on that line. Last time I only clicked dots, never a line... I'll try clicking right on the line between them.

## Step 1
`REAL_DIST=.../tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <session> --click-at 763,158`
Output: `at 763,158: edge with id "15"` -> 02.png
Oh nice, the line turned blue and the right panel says "Station -> Stadium, Edge", From Station, To Stadium, minutes 4. So that link takes 4 minutes. Essay sentence: "The bus link from Station to Stadium takes 4 minutes." Now I need to point out just the two stops. Selection says 1 -- that's the line, I guess. I'll click Station first, then hold Shift and click Stadium, like picking two files.

## Step 2
`... real.mjs --step <session> --click "Station"` -> 03.png
Station has a yellow glow now, the panel says Station, Node, and Selection is 1. The line went back to gray, good, so the line is not picked anymore. Now Shift-click Stadium to add it.

## Step 3
`... real.mjs --step <session> --shift-click "Stadium"`
Output: `clicked node "Stadium" on the canvas, at 726,221` -> 04.png
Oh nice, that's it: Station and Stadium both glow yellow, the panel says "2 nodes selected", Nodes 2, Edges joining these nodes 1, and Selection in the left list says 2. No other stop glows. So whatever I do next should apply to just those two. I'm done with this part.

## End
`... real.mjs --end <session>` -- session ended.

**Did I finish?** Yes. The Station-to-Stadium link takes 4 minutes (the panel showed "minutes 4" when I clicked the line). Then I picked out Station and Stadium only: both glow, the panel says "2 nodes selected".

**Ease:** 6 of 7.

**What confused me:** Only small things. I wasn't sure a thin line could be clicked at all -- I'd only ever clicked dots -- but it worked first try and the line turned blue. When I clicked Station afterward I wasn't sure whether the line would stay picked too; the Selection count going 1 -> 1 -> 2 and the line turning gray again told me it was just the dots. The panel title "Station -> Stadium" has an arrow, so I wondered for a second if the 4 minutes only counts one way, but the task didn't ask about that.
