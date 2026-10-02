# Session: keyboard walk through the characters -- Marcus, criminal intelligence analyst

Task as given: "Without using the mouse, move from character to character through the drawing
and learn who each one is and how many others they appear with. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t35/01.png. Renders: tmp/round-7-sessions/t35--intelligence-analyst/NN.png.
Every command was run from design/ui/prototype; each replays from the start screen.
Below, D = tmp/round-7-sessions/t35--intelligence-analyst and T = `--key Tab`.

## Think-aloud

**01 (start).** Flat chart of orange dots, names on the big ones. Valjean in the middle. A summary
on the right: 77 nodes, 254 edges. No mouse. In i2 I'd Tab or arrow around. Tab first.

**02** `node app-b/study.mjs --try D/02.png task:t35 --key Tab`
First Tab lands on the graph picker, "Co-appearances". Not what I want. I want the drawing.

**03** `... --try D/03.png task:t35 T T T T T`
Five Tabs and I'm on "Show hidden rows" at the bottom of the left list. Drawing should be next.

**04** `... --try D/04.png task:t35 T T T T T T`
Blue box around the drawing. The box doesn't match the gray area -- it cuts across under the
legend and stops above the toolbar. Looks off, but fine, it's focused.

**05** `... --try D/05.png task:t35 T T T T T T --key ArrowRight`
A hint pops up: "Arrows orbit the camera." Nothing moved. I don't want to orbit anything, it's a
flat picture. I want to go from one person to the next.

**06** `... --try D/06.png task:t35 T T T T T T T`
One more Tab and a ring lands on Valjean with a tag: "Valjean, group 2, degree 36". Good.
Degree is his number of links -- 36 others he appears with.

**07, 08** `... T x8` and `... T x9`
Next Tab jumps out of the drawing to the Analyze button, then to "Show table". So Tab gives me
exactly one character. That's strike one.

**09** `... T x7 --key ArrowRight`
From Valjean, arrow again: "Arrows orbit the camera" again. The tag disappears. Strike two.

**10** `... T x7 --key Enter`
Enter picks Valjean. Bottom of the drawing: "Valjean, 36 connections". That's the answer in
plain words. A row of icons appears. The right panel flips to "Style -- Why this look", which is
how he's colored, not who he is.

**11** `... T x7 --key Enter --key ArrowRight`
Arrows still "orbit the camera". Is there a way to just step to the next guy?

**12, 13** `... T x7 --key Enter T` and `... --key Enter T T`
Tab goes back to Valjean, then into the new icon row: first one is "Neighborhood".

**14** `... T x7 --key Enter T T --key Enter`
"Neighborhood of Valjean ... Selected: Valjean and his 36 neighbors." More names show:
Bamatabois, Thenardier, Claquesous, Gillenormand, Montparnasse. That's the i2 "expand one
level" and I like it. But it doesn't let me walk from person to person. Strike three on the
stepping. Last thing before I quit: every app has "?" for shortcuts.

**15** `... T x7 --key "?"`
Keyboard shortcuts sheet. "Shift+Arrows -- Walk nodes." That's what I wanted and nothing on the
drawing told me. The hint on the drawing only says arrows orbit. Also the sheet says that in 2D
arrows pan -- my chart looks flat, but it told me "orbit", so is it in 3D or not?

**16** `... T x7 --key Shift+ArrowRight`
"Judge, 6 connections." It works. But I pressed right and the ring went to a dot LEFT of Valjean.

**17** `... T x7 Shift+ArrowRight x2` -- back to "Valjean, 36 connections".
**18** `... T x7 Shift+ArrowRight x3` -- "Javert, 17 connections".
**19** `... T x7 Shift+ArrowRight x3 --key Shift+ArrowDown` -- "Marius, 19 connections".
It hops along the lines roughly the way I point. The count at the bottom is what I need. The
right panel still shows Style, so "who is this" isn't on screen -- just a name.

**20-22** `... (as 19) --key F6`, `F6 F6`, `F6 F6 F6`
The sheet said F6 moves between regions. First F6 goes to the Neighborhood icon, third lands in
the right panel on the name "Marius".

**23, 24** `... (as 19) F6 F6 F6 T T` and `... T T --key ArrowRight`
Tab to the Style tab, right arrow to Data. Now the Data panel -- and it is WRONG. Header says
Marius. Bottom of the drawing says "Marius, 19 connections". The Data panel says label Valjean,
id 11, group 2, Degree 36, "#1 of 77", bridges to Labarre, Mme.deR, Isabeau... That's Valjean's
card under Marius's name. And it says "From miserables.json" when the graph header said it came
from miserables.gexf. Two places on one screen disagree. If I read that to a sergeant I'd be
wrong, and I'd never know which one to trust.

**25** `... (as 24) F6 F6 F6` -- three more F6 put me on the graph picker on the left, not the
drawing. I've lost track of the region order.

**26** `... (as 24) F6 F6 F6 --key Shift+ArrowRight` -- stepping from the picker does nothing.

**27** `... (as 24) F6 F6 F6 F6 --key Shift+ArrowRight`
Back in the drawing, step: "Gavroche, 22 connections". And the right panel has flipped back to
Style. So for every person I'd go F6 three times, Tab twice, arrow, read, F6 four times, step.
For 77 people. No. I stopped here.

## Result

- **Succeeded?** Half. I can walk the drawing by keyboard and get "how many others" for each
  person off the line at the bottom (Valjean 36, Judge 6, Javert 17, Marius 19, Gavroche 22).
  But I only found the walk key in the shortcuts sheet after three dead ends, and "who each one
  is" failed: the Data panel showed Valjean's details under Marius's name, and it resets to
  Style every time I move.
- **Single Ease Question:** 2 of 7.
- **Would I use this instead of my current tool?** No. In i2 or Excel I'd just sort a list of
  names by link count. Here, the one time I looked at the details panel it gave me the wrong
  person's numbers, and a tool that puts one man's record under another man's name doesn't go
  near a case file. The walk itself and the "Name, N connections" line are good; fix the panel
  and tell me about Shift+Arrows on the drawing and I'd look again.
