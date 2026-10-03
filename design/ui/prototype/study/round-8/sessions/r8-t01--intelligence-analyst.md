# Session: first-time walk-through on the Les Miserables sample -- Marcus, criminal intelligence analyst

Task as given: get the Les Miserables network on screen, have the program work something out
about the characters, make the drawing show that result in colors or sizes, get the names on
the drawing, and finish with a picture file for a document. Say when each part is done.

All commands were run from
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype.
Renders are in tmp/round-8-sessions/r8-t01--intelligence-analyst/ under that folder.
In the commands below, OUT stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t01--intelligence-analyst.

## 01 -- start screen (shots/tasks/r8-t01/01.png)

"OK. Top right says 'Local only', and on the left, 'Files are read on this computer and never
uploaded.' Good, that's the first thing I look for. If that's true I could actually put a case
in here someday.

Big box at the bottom wants usage data. 'Your data is yours, but please help us.' No. I don't
opt into telemetry on a work machine. 'No thanks.'

Samples on the right. Les Miserables, 77 characters. That's the one the moderator said. Click it."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try OUT/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"Network's up. Part one done -- it's on screen. Dots and lines, a handful of names on the
biggest ones. Flat, not spinning. Good.

But it's already colored. Orange to brown, legend says 'Color: PageRank 0.00330 to 0.0754.' I
didn't do that. And the list on the left is a whole case file already: PageRank, Louvain 6
groups, Shortest paths, Density, Link prediction, Watchlist, 'For the report', Betweenness...
Somebody else's chart. I'm supposed to make the program work something out myself, so I'm not
taking credit for what's already here.

PageRank, I don't know what that is in my world. 0.0754 of what? Betweenness I know -- that's
the middleman. That's what I want. The right panel says 'Measure from Analyze.' The little
flask at the bottom, I'll bet that's Analyze."

## 03 -- Analyze

    timeout 120 node app-b/study.mjs --try OUT/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"There it is, an Analyze box. Recent, then 'Rank nodes and edges': PageRank, Degree, Total
value, Betweenness -- 'Which nodes sit on the most shortest paths between o...' -- yeah, that's
the broker. Click that."

## 04 -- first try at Betweenness

    timeout 120 node app-b/study.mjs --try OUT/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"

(The tool reported two controls called Betweenness -- the row in the left list and the entry in
the Analyze box -- and the click on the first one timed out; the screen did not change.)

"Nothing. Same box. Click it again, more specifically."

## 05 -- Betweenness settings

    timeout 120 node app-b/study.mjs --try OUT/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"OK. 'Which nodes sit on the most shortest paths between others.' Plain enough, I could say
that on the stand. Then Weight, 'value (loaded weight)', Higher means Stronger / Farther /
Capacity, and a paragraph about 1/value. I don't know what the weight is in a novel. Number of
chapters they share, I guess. Leave it. 'Under a second.' Run."

## 06 -- Run

    timeout 120 node app-b/study.mjs --try OUT/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"Box closed. New row on the left, 'Betweenness 2', with a spinner and a blue bar under it.
Drawing hasn't changed, legend still says PageRank. It said under a second. Let me click the
row."

## 07 -- click the running row

    timeout 120 node app-b/study.mjs --try OUT/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"

"Still spinning. Right side still shows the graph summary, not my result. Under a second, my
foot."

## 08 -- give it a beat and try again

    timeout 120 node app-b/study.mjs --try OUT/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --key Escape --click "Betweenness 2"

"Same. Spinner, bar, nothing. That's one."

## 09 -- hover the row to see what it says

    timeout 120 node app-b/study.mjs --try OUT/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --hover "Betweenness 2"

Tooltip: "This name cannot be changed: a run is named by its algorithm, and a second run of the
same algorithm is numbered (Louvain 2)"

"I didn't ask to rename it. I asked if it's done. Is it done? Is it stuck? It doesn't say. That's
two."

## 10 -- use the Betweenness that is already in the list

    timeout 120 node app-b/study.mjs --try OUT/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness"

"Fine. There's already a Betweenness down in 'For the report', with a crossed-out eye. Click
that.

Right panel: 'Covered by PageRank for Color' and a 'Move above' button. 'Paints 77 nodes, none
visible.' OK, that one I actually understand -- it's underneath the PageRank colors. Two coats
of paint, the top one wins. Move it above."

## 11 -- Move above

    timeout 120 node app-b/study.mjs --try OUT/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness" --click "Move above"

"Message at the bottom: 'Moved Betweenness above PageRank.' Right panel now says 'Covers
PageRank for Color.' But the drawing -- same orange to brown. Legend in the corner still says
'Color: PageRank.' And in the list, Betweenness is still sitting down at the bottom of 'For the
report', under PageRank, eye still crossed out. So which one's lying, the message or the
picture?

The crossed-out eye. Maybe it's switched off. Click the eye."

## 12 -- turn it on

    timeout 120 node app-b/study.mjs --try OUT/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness" --click "Move above" --click "Show"

(The tool reported four controls containing "Show" and clicked the first, "Show Betweenness".)

"Eye's open now. Picture: identical. Legend: PageRank. The panel says Yellow to orange; the
dots are orange to brown. I've told it twice to paint betweenness and it says it did and it
didn't. That's three. I can't put a chart in front of a sergeant when the legend and the
picture disagree with the side panel.

Let me at least see if the names part works. There's a 'Label' with a plus on the right."

## 13 -- Label

    timeout 120 node app-b/study.mjs --try OUT/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness" --click "Move above" --click "Show Betweenness" --click "Label"

"Nothing opened. Still just 'Label +'. And that Label is under the Betweenness panel anyway --
I want names on everybody, not a betweenness label. I don't know where you put names on the
whole chart."

## 14 -- is there at least an export?

    timeout 120 node app-b/study.mjs --try OUT/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Export"

The tool reported: nothing on screen is called "Export".

"No Export button anywhere I can see. In i2 it's File, Save As picture, done. There's a
hamburger in the corner, maybe it's in there, but I'm done hunting. I'm calling it."

## Where each part ended

- Network on screen: done (render 02). "That part was fast. One click."
- Program works something out: I ran Betweenness and it never finished as far as I could tell
  -- the row just spun (renders 06 to 08). Not done.
- Drawing shows the result: not done. I moved the existing Betweenness above PageRank and
  turned it on; the app said it did both and the picture, the corner legend and the list order
  stayed on PageRank (renders 11, 12). The only colors on screen were somebody else's PageRank.
- Names on the drawing: not done. About a dozen names were already showing; I found no way to
  put names on all of them (render 13).
- Picture file: not done. Nothing called Export on screen (render 14).

## Debrief

**Did I succeed?** No. I got the network up and I found the right measure. After that it
was four dead ends in a row. The one thing I'd hand someone is the PageRank picture, and that
was already there when I opened it.

**Single Ease Question (1 = very difficult, 7 = very easy): 2.** Getting the network up and
finding Betweenness with a one-line definition was easy, and I liked that. Everything after
Run fought me.

**Would I use it instead of i2 and Excel?** Not today. Three things I did like: it says up
front that files stay on this computer. Betweenness came with a sentence I could repeat in
court. And when a color was hidden under another one, it told me 'Covered by PageRank' with a
button to fix it, which is more than most tools do. But the run spun with no word on whether it
finished, and 'Moved above' and the eye both said yes while the picture said no. A tool where
the side panel and the picture disagree is a tool I can't testify about. And the sample opened
with a dozen layers already stacked up, so I couldn't tell what I'd done from what came in the
box. If the run finished and the chart changed when it said it did, and there was a plain
'Save picture', I'd give it another look on a real phone dump.
