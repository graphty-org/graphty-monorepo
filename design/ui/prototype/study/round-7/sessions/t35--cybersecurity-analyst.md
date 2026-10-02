# Session: keyboard-only walk through the drawing -- Priya, threat hunter

Task as given by the moderator: "Without using the mouse, move from character to character
through the drawing and learn who each one is and how many others they appear with. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t35/01.png. Renders: tmp/round-7-sessions/t35--cybersecurity-analyst/NN.png.
All commands run from design/ui/prototype. `$D` is that render folder; `$T` is seven presses of Tab
(`--key Tab` x7) unless noted.

## Think-aloud

**Start (t35/01.png).** "Fine. Novel characters, so think of them as accounts, an edge is 'logged
on in the same window'. Keyboard only, which is how I'd rather work anyway. Top bar says 'Local
only' -- good, that's one of my three questions answered without asking. No idea yet how you get
into the picture with a keyboard. Tab and see."

**01 -- one Tab.**
`timeout 120 node app-b/study.mjs --try $D/01.png task:t35 --key Tab`
"Focus went to the graph picker, 'Co-appearances'. Not what I want. Keep tabbing."

**02 -- six Tabs.**
`timeout 120 node app-b/study.mjs --try $D/02.png task:t35 --key Tab x6`
"Blue box around the drawing. So the canvas takes focus. Took six tabs, which is a lot, but OK."

**03 -- arrow on the canvas.**
`... --try $D/03.png task:t35 (Tab x6) --key ArrowRight`
"Toast: 'Arrows orbit the camera'. I didn't ask to orbit anything, I want the next node. At least
it told me what it did instead of doing nothing silently."

**04, 05 -- Enter, then Tab, on the canvas.**
`... --try $D/04.png task:t35 (Tab x6) --key Enter`
`... --try $D/05.png task:t35 (Tab x6) --key Tab`
"Enter: nothing. Tab: now there's a ring on the big dark node and a tooltip -- 'Valjean, group 2,
degree 36'. That's a node and its count. So Tab gets me into the nodes."

**06, 07 -- keep tabbing for the next character.**
`... --try $D/06.png task:t35 $T --key Tab`
`... --try $D/07.png task:t35 $T --key Tab --key Tab`
"No. The next Tab jumps out to the toolbar ('Analyze'), then the table button. So Tab gives me
exactly one node -- the biggest one -- and leaves. That's not 'move from character to character'."

**08, 09 -- arrows while Valjean has the ring.**
`... --try $D/08.png task:t35 $T --key ArrowRight`
`... --try $D/09.png task:t35 $T --key ArrowDown`
"Still 'Arrows orbit the camera'. And the tooltip went away. Annoying."

**10 -- Enter on Valjean.**
`... --try $D/10.png task:t35 $T --key Enter`
"OK, that selected him. Strip under the drawing: 'Valjean, 36 connections'. Inspector on the right
switched to Valjean, Style tab, 'Why this look'. Selection count is 1. Good. Now how do I get to his
neighbors?"

**11, 12 -- arrow and Tab after selecting.**
`... --try $D/11.png task:t35 $T --key Enter --key ArrowRight`
`... --try $D/12.png task:t35 $T --key Enter --key Tab`
"Arrow: orbit again. Tab: back to the Valjean ring. I'm going in circles. This is where I'd look for
a shortcut list. Try '?'."

**13 -- '?' for shortcuts.**
`... --try $D/13.png task:t35 $T --key ?`
"There it is. 'Shift+Arrows -- Walk nodes', both 2D and 3D. And F6 for regions, '/' for search. The
list is good -- it's the only reason I got any further. But nothing on the screen told me
Shift+Arrows exists. The toast that said 'Arrows orbit the camera' could have said 'Shift+Arrows
walk nodes' in the same breath."

**14 -- Shift+Right from Valjean.**
`... --try $D/14.png task:t35 $T --key Shift+ArrowRight`
"Moved. Strip says 'Judge, 6 connections', inspector says Judge. But the ring is on a node to the
LEFT of Valjean. I pressed right."

**15, 16, 17 -- more walking.**
`... --try $D/15.png task:t35 $T --key Shift+ArrowRight --key Shift+ArrowRight`
`... --try $D/16.png task:t35 $T --key Shift+ArrowUp`
`... --try $D/17.png task:t35 $T --key Shift+ArrowLeft`
"Right twice: Judge, then back to Valjean. So it's flipping between two, not walking. Up: 'Brevet,
6 connections' -- up and to the left. Left: 'Mlle.Gillenormand, 7 connections' -- way left. I can't
predict where any key goes. Is it walking along edges or by screen position? It doesn't say. In a
real hunt I'd want 'next neighbor of this account', in some order -- by edge weight, by count,
anything -- not a guess about geometry."

**18, 19, 20 -- get to the Data tab for 'who is this'.**
`... --try $D/18.png task:t35 $T --key Shift+ArrowLeft --key F6 --key F6`
`... --try $D/19.png task:t35 $T --key Shift+ArrowLeft --key F6 x3`
`... --try $D/20.png task:t35 $T --key Shift+ArrowLeft --key F6 x3 --key Tab --key Tab --key ArrowRight`
"F6 went canvas, table button, inspector -- skipped the toolbar, whatever. Got onto the Data tab.
And here's the problem: the header says Mlle.Gillenormand, the strip says Mlle.Gillenormand, 7
connections. The Data tab under it says label Valjean, id 11, degree 36, PageRank #1. That's
someone else's record under her name. If I saw that in an EDR console -- host name on top, another
host's fields below -- I'd stop trusting every panel in the tool."

**21, 22, 23 -- back to the drawing, keep walking with Data open.**
`... --try $D/21.png task:t35 (as 20) --key F6 x3`
`... --try $D/22.png task:t35 (as 20) --key F6 x3 --key Shift+ArrowDown`
`... --try $D/23.png task:t35 (as 20) --key F6 x4 --key Shift+ArrowDown`
"Three F6 put me on the graph picker, not the drawing; Shift+Down there did nothing. Four F6 got
me back. Walked to 'Lt.Gillenormand, 4 connections'. And the inspector flipped back to the Style
tab. So every step I'd have to F6 three times and tab twice to see the record, and the record is
wrong anyway. I'll take the strip under the drawing: name and connection count. That's the task."

**24 -- the table, because that's what I actually want.**
`... --try $D/24.png task:t35 $T --key Shift+T`
"Shift+T: table, sorted by degree. Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16.
That's how I'd do this for real -- top of the list down. One more thing: table says Valjean's
betweenness is 0.570; the inspector a minute ago said 0.419. Which is it? And opening the table
dropped my selection count. I'm done."

## Outcome

- Did I succeed? Partly. I can move from node to node with the keyboard (Shift+Arrows, found only
  through '?'), and each step tells me the name and the connection count in the strip under the
  drawing. I walked Valjean (36), Judge (6), Brevet (6), Mlle.Gillenormand (7), Lt.Gillenormand
  (4). But I couldn't control where I went, and the detail panel showed the wrong person's data, so
  "who each one is" beyond a name I would not sign off on.
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? Not for this. For "who is this and how many
  neighbors" my Splunk table sorted by count is faster, and this tool's own table (Shift+T) is
  nearly that. The keyboard walk is a nice idea, but a walk whose direction I can't predict and a
  panel that disagrees with its own header is a tool I can't put in a case. The '?' sheet and the
  'Local only' chip are the two things here I'd give credit for.

## Problems seen

1. Inspector Data tab showed Valjean's record (label, id 11, degree 36) under the heading
   Mlle.Gillenormand while the strip said "Mlle.Gillenormand, 7 connections" (render 20).
2. Shift+Arrow direction does not match the screen: Shift+Right went to a node left of Valjean,
   and a second Shift+Right came straight back (renders 14, 15). No hint whether it follows edges
   or position.
3. Shift+Arrows is discoverable only through '?'. The canvas toast says "Arrows orbit the camera"
   and nothing else (renders 03, 08).
4. Tab reaches exactly one node (the biggest) and then leaves the drawing (renders 05, 06).
5. The inspector resets to the Style tab on every step, so the Data tab costs F6 x3 + Tab x2 per
   node (renders 20, 23).
6. F6 order is not the one the shortcut sheet lists: from the canvas it skipped the toolbar, and
   from the inspector it took four presses, not three, to return to the canvas (renders 18, 22).
7. Betweenness for Valjean differs: 0.419 in the inspector (render 20), 0.570 in the table
   (render 24).
8. "Why this look" lists "Group 2" for every node walked (Judge, Brevet, Gillenormands), which I
   doubt.
