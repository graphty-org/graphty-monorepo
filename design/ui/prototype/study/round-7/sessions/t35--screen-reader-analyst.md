# Session: walk the drawing by keyboard -- Morgan Reyes (screen-reader analyst)

Task as given: "Without using the mouse, move from character to character through the drawing and
learn who each one is and how many others they appear with. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t35/01.png. All renders are in
tmp/round-7-sessions/t35--screen-reader-analyst/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <dir>/NN.png task:t35 ...`;
below, `TAB xN` means N `--key Tab` steps.

## Think-aloud

**01 -- `TAB x3`.** Title says Les Miserables, then Co-appearances. Summary on the right reads
nodes 77, edges 254, undirected, one connected component, highest degree 36. Good: size first,
without me asking. Three Tabs and I am on "List options". Named. Fine.

**02 / 03 -- `TAB x8`, `TAB x20`.** Eight Tabs lands on "Analyze, Shift+A". Twenty lands on a
link "value, stronger" in the summary. So the tab order goes left panel, drawing, toolbar,
right panel. I need to find where the drawing is in that.

**04 -- `TAB x6`.** Focus is on the drawing area itself. No name I can tell from here beyond the
ring; I am going to assume it says something like "graph" or "canvas".

**05 -- `TAB x7`.** Next stop is a node: "Valjean, group 2, degree 36". That is the first thing
in the drawing that told me something. Interested, slightly surprised. It starts on the biggest
character, which is a sensible place to start.

**06 / 07 -- `TAB x6 --key ArrowRight`, `TAB x7 --key ArrowRight`.** Plain arrow says "Arrows
orbit the camera". On the drawing and on the node. So my first instinct, arrow to the next thing,
spins a camera I cannot see. That is one dead end. It told me what it did, at least, and did not
pretend.

**08 -- `TAB x7 --key Enter`.** Enter on Valjean selects him. A line reads "Valjean, 36
connections", the selection count goes to 1, the right panel now has Valjean's name at the top, and
a row of five icon buttons appears. "36 connections" is the answer to "how many others he appears
with", in words. Good.

**09 -- `TAB x7 --key ?`.** Question mark opens "Keyboard shortcuts". It is a real dialog with a
Close button and Esc. Under the canvas: "Shift+Arrows -- Walk nodes". There it is. I would have
found this eventually; I always press the question mark. Note it is under a heading called
"Canvas (graphty-element)" -- I do not know what graphty-element is and do not care.

**10 -- `... --key Shift+ArrowRight`.** "Judge, 6 connections". Moved and selected Judge.

**11 -- `... --key Shift+ArrowRight x2`.** Second Shift+Right takes me back to "Valjean, 36
connections". Right, then right again, and I am back where I started. So "right" is not "next".
It is something about where the dots sit on the screen.

**12 / 13 -- `... --key Shift+ArrowDown`, then x2.** "Cochepaille, 6 connections", then
"Gervais, 1 connection". Gervais has one connection. Is he connected to Cochepaille, whom I just
came from? I have no way to know. The walk does not say "via" anything and does not follow the
links; it goes to whatever is "below". In a picture I cannot see, "below" is meaningless. I can
visit people, but I cannot move "by relationships". Spatial language for a drawing whose layout
I have never seen.

**14 -- `... --key Shift+ArrowUp`.** "Brevet, 6 connections". Fine. Each stop is short, name first,
count second. At my speed that is about right.

**15 / 16 -- `... --key F6`, then F6 x3.** F6 goes to a "Neighborhood" button in the row under
the drawing, then on to the right panel, landing on the heading "Brevet". That is the region key
the shortcuts list promised. Good, it holds.

**17 -- `... Shift+ArrowUp, F6 x3, TAB x2, --key ArrowRight`.** I want to know who Brevet is, so
I go to the "Data" tab. The heading still says Brevet. The data says: id 11, label **Valjean**,
group 2, Degree **36**, #1 of 77, bridges to Labarre, Mme.deR, Isabeau, Gervais, Scaufflaire.
That is Valjean's record under Brevet's name. The announcement said Brevet has 6 connections; the
panel says 36.

**18 -- same, from Judge (`Shift+ArrowRight`).** Heading "Judge". Data: label Valjean, degree 36.
Same record again. The detail panel is stuck on the first character, whoever I walk to.

That is the point I stop. Two sources in the same tool tell me two different numbers for the same
person, and one of them names a different person. I would not guess which one is right, and I
cannot check it against the table without the mouse-free route to it working too. The short line
under the drawing ("Brevet, 6 connections") is the only part I believe, and it is a line that gets
replaced on every keystroke: once I move on, it is gone.

## Outcome

- **Did I succeed?** Partly. I could move from character to character and hear each one's name and
  connection count. I could not learn "who each one is" beyond the name: the panel that should say
  who they are showed someone else. And I could not walk along the links, only around the picture.
- **Single Ease Question:** 3 out of 7. The walk itself, once found, is easy. Finding it took the
  shortcuts list after the plain arrows spun the camera, and the detail panel then lied to me.
- **Would I use this instead of my current tool?** No. In NetworkX `G.degree("Brevet")` and
  `list(G.neighbors("Brevet"))` give me the number and the names, every time, the same. Here I get
  the number in a passing line and a detail panel that disagrees with it. If the panel followed
  the person I walked to, and if there were a way to walk to the people a character is actually
  linked to (and back), I would try it for exploring a network I have not met yet. Not for
  anything I have to report.

## What I would take away

- Plain arrows on a node orbit a camera. For me that is noise; the first key I press should move
  me somewhere useful.
- Walking goes by screen position ("down", "right"), not by link. Right then right brought me back
  to the start. I cannot tell whether two characters I stepped between appear together.
- The Data tab in the right panel kept showing Valjean (label Valjean, degree 36) while the heading
  and the spoken line named Brevet and Judge with 6 connections. A number that disagrees with
  itself disqualifies the tool for me.
- The "Name, N connections" line is good, but it is the only place the fact lives while walking.
  I want to be able to read it again after it changes.
- The detail panel opens on "Style / Why this look" first. I asked who someone is; how they are
  painted is second.
- Good, and worth keeping: size summary up front, named buttons with their keys in the name
  ("Analyze, Shift+A"), a real shortcuts dialog on the question mark, F6 between regions.

## Commands run

```
D=tmp/round-7-sessions/t35--screen-reader-analyst ; T="--key Tab"
node app-b/study.mjs --try $D/01.png task:t35 $T $T $T
node app-b/study.mjs --try $D/02.png task:t35 $T x8
node app-b/study.mjs --try $D/03.png task:t35 $T x20
node app-b/study.mjs --try $D/04.png task:t35 $T x6
node app-b/study.mjs --try $D/05.png task:t35 $T x7
node app-b/study.mjs --try $D/06.png task:t35 $T x6 --key ArrowRight
node app-b/study.mjs --try $D/07.png task:t35 $T x7 --key ArrowRight
node app-b/study.mjs --try $D/08.png task:t35 $T x7 --key Enter
node app-b/study.mjs --try $D/09.png task:t35 $T x7 --key "?"
node app-b/study.mjs --try $D/10.png task:t35 $T x7 --key Shift+ArrowRight
node app-b/study.mjs --try $D/11.png task:t35 $T x7 --key Shift+ArrowRight --key Shift+ArrowRight
node app-b/study.mjs --try $D/12.png task:t35 $T x7 --key Shift+ArrowDown
node app-b/study.mjs --try $D/13.png task:t35 $T x7 --key Shift+ArrowDown --key Shift+ArrowDown
node app-b/study.mjs --try $D/14.png task:t35 $T x7 --key Shift+ArrowUp
node app-b/study.mjs --try $D/15.png task:t35 $T x7 --key Shift+ArrowUp --key F6
node app-b/study.mjs --try $D/16.png task:t35 $T x7 --key Shift+ArrowUp --key F6 --key F6 --key F6
node app-b/study.mjs --try $D/17.png task:t35 $T x7 --key Shift+ArrowUp --key F6 x3 $T $T --key ArrowRight
node app-b/study.mjs --try $D/18.png task:t35 $T x7 --key Shift+ArrowRight --key F6 x3 $T $T --key ArrowRight
```
(each wrapped in `timeout 120`; `x N` means the step repeated N times)
