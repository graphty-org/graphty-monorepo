# Session: path between two people -- Marcus, criminal intelligence analyst

Task as given by the moderator: "Which characters link Fantine to Gavroche through as few others
as possible? Show it in the drawing. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter. If that is not your line of work, treat
them as your own people or things."

Start screen: shots/tasks/t12/01.png. Renders: tmp/round-7-sessions/t12--intelligence-analyst/.
All commands were run from design/ui/prototype with
`D=$PWD/tmp/round-7-sessions/t12--intelligence-analyst`.

## Think-aloud

**01 (start screen).** "Okay, a chart of the whole book. Labels on maybe fifteen of them. Fantine's
up top, Gavroche is down in the bottom cluster. Over on the left there's already a 'Shortest
paths' row with 'Valjean to Javert' and 'Myriel to Javert' under it. So somebody's done this. I
need a new one, Fantine to Gavroche."

**02.** `timeout 120 node app-b/study.mjs --try $D/02.png task:t12 --click "Shortest paths"`
"I clicked Shortest paths. Row lights up, fine. The panel on the right says Louvain. I didn't click
Louvain. Nothing in here says 'new path' either. That's not a great start."

**03.** `... --try $D/03.png task:t12 --hover "Analyze"`
"Beaker thing at the bottom. Tooltip says Analyze, Shift+A. That's where a path finder would live."

**04.** `... --try $D/04.png task:t12 --click "Analyze"`
"A list. Recent: Louvain, PageRank, Shortest path -- 'the fewest steps, or the lightest route,
between two nodes.' That's my question. Good, that was quick."

**05.** `... --try $D/05.png task:t12 --click "Analyze" --click "Shortest path"`
"'Path between.' From, To. Weight is set to 'value (loaded weight)', 'Stronger', and it says it
reads the weight as distance, one over value. I don't want weighted. I asked for the fewest people
in between. I'll deal with that after I get the names in. Banner at the top says 'Click a node or
set for From.'"

**06.** `... --try $D/06.png task:t12 --click "Analyze" --click "Shortest path" --click "Fantine" --click "Gavroche"`
Tool reported: nothing on screen is called "Fantine"; nothing on screen is called "Gavroche".
"It told me to click a node. I clicked Fantine right where her name is on the chart. Nothing. Box
is still empty. Same with Gavroche."

**07.** `... --try $D/07.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name"`
"Fine, the From box says 'Type a name.' Clicked in it."

**08.** `... --try $D/08.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name" --type "Fantine"`
"Typed Fantine. Box still says 'Type a name'. No suggestions came up, nothing. That's two."

**09.** `... --try $D/09.png task:t12 --click "Analyze" --click "Shortest path" --click "Click to pick"`
"Tried the To box. Now the banner says 'set for To' and the placeholders swapped -- From says
'Click to pick', To says 'Type a name'. So it moves the cursor around but I still can't put a
person in either one. Is there a way to just pick them from a list?"

**10.** `... --try $D/10.png task:t12 --click "Table"`
"Table at the bottom. There's a list of people. Gavroche is second. Let me pick him here and see
if the path tool picks up what I've selected."

**11.** `... --try $D/11.png task:t12 --click "Table" --click "Gavroche"`
"Gavroche is circled on the chart, 'Gavroche, 22 connections', and a little toolbar popped up over
the chart. Second icon looks like the squiggle next to Shortest paths."

**12.** `... --try $D/12.png task:t12 --click "Table" --click "Gavroche" --hover "Path"`
(I also tried hovering "Shortest path" and "Path from here"; the last one: nothing on screen is
called that.) "Tooltip says 'Path between', key P. That's it."

**13.** `... --try $D/13.png task:t12 --click "Table" --click "Gavroche" --click "Path between"`
"From: Valjean. To: Javert. I selected Gavroche. Gavroche isn't in either box. And the side panel
now says '2 nodes' when I selected one. Which one's lying? That's three. If I put that on a
chart and the defense asks me why Valjean's on it, I've got no answer."

**14.** `... --try $D/14.png task:t12 --click "Table" --click "Gavroche" --click "Path between" --click "Valjean"`
"Clicked the From box to change it. No dropdown, no list, just the banner telling me to click a
node again. Which I already tried."

**15.** `... --try $D/15.png task:t12 --click "Table" --click "Gavroche" --click "Path between" --click "Find path"`
"I'll hit Find path just to see what an answer looks like, even though it's the wrong two people.
'Path added, Undo.' '1 edge, total value 17.' Right side: Valjean start, Javert end, 'Edge value
17 shared chapters'. Okay -- that part I like. That's a reason for the link I could say out loud.
But I look at the chart and I can't tell where the path is. Everything is the same orange. And
it's still Valjean to Javert, not Fantine to Gavroche. I'm done."

## Outcome

Gave up. I never got Fantine or Gavroche into the path tool, so I never got an answer, and I never
saw a path drawn on the chart.

- Did I succeed? No.
- Single Ease Question (1 = very difficult, 7 = very easy): **2**. Finding the tool was easy --
  Analyze, Shortest path, two clicks. Telling it who I meant was impossible.
- Would I use this instead of i2 and Excel? Not today. In i2 I select two people and hit Find Path
  and it highlights the chain. Here the tool was easy to find and the result panel was actually
  better than i2's -- people in path order, and the link says "17 shared chapters", which is
  traceable. But it ignored who I clicked, filled in two people I didn't pick, and when it did run
  I couldn't see the path in the drawing. A tool that puts names I didn't choose on my chart is a
  tool I can't defend in court. Fix the picking and highlight the path and I'd look again.

## Problems, in my words

1. Clicking a person on the chart did nothing, even though the banner said "Click a node".
2. Typing a name in "Type a name" did nothing: no suggestions, box stayed empty.
3. Selecting Gavroche, then "Path between", filled in Valjean and Javert -- neither of whom I picked.
   Side panel said "2 nodes" after I selected one.
4. No way to change From or To once filled -- no list to pick from.
5. After "Find path", the chart showed no visible path; everything stayed the same orange.
6. The weight defaults to "value, stronger" (one over value). For "as few others as possible" I want
   plain hop count, and it wasn't obvious that's not what it'd give me.
7. Clicking the "Shortest paths" row in the left list showed Louvain in the right panel.
