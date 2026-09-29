# Session: walk from TP53 without the mouse -- Morgan, screen-reader analyst

Participant: Morgan, 38, senior analyst in public-health network research, blind, NVDA on
Windows with a braille display, keyboard only, screen curtain on. Uses NetworkX and Excel today.

Task as given by the moderator: "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

Screens used: the keyboard walk screen (the protein network, 33 of 300 nodes shown), reached
from a fresh load with nothing selected. The inspector was heard through the walk's Enter key;
the table was reached with Tab. The separate inspector and table pages were not needed.

How it was run: every key below was pressed in the clickable mock in a real browser, and what
the page gives the screen reader (the focused element's name and the live region) was read back
after each key. What Morgan "hears" in this transcript is that text, word for word. Mock chrome
above the frame (the gallery link, the state tabs, the annotations box) is not product and is
left out.

## Think-aloud transcript

**Page load, headings first.**

"Title: 'Keyboard walk on the protein network.' OK. H. 'Protein interactions, heading level 1.'
H again: 'Graphs', 'Sets and paths', 'Styles', 'Views 1', and 'Graph' over on the side. Views 1
-- is that one view, or a heading called 'Views 1'? Whatever. What I don't get from the heading
key is the graph itself or the table. There's no heading that says 'Nodes table' or 'Drawing'.
So headings get me the left panel and that's it. Minus one, but it has named its parts, which is
more than Gephi did."

**Tab, a few times.**

"Tab. 'Skip to the graph drawing. F6 moves between regions.' Nice, first thing, and it tells me
the region key. I'll remember F6. Before I take it -- one more Tab to see what's behind it."

"Tab. 'Main menu, button.' Arrow down. Nothing. Arrow right. Nothing. Tab: 'Graph, button.'
Tab: 'Assistant.' 'Results.' 'Notes.' '33 of 300, button.' 'Find in Graphs.' 'Add to Graphs.'
'ppi-core-300, 300 nodes.' 'Add to Sets and paths.' 'Add to Styles.' 'Size by degree, style
layer.' That's twelve stops and none of them answer an arrow key. Then: 'Tools, toolbar. Select,
pressed, 1 of 5.' Now it talks. Tab: 'Graph drawing, application.' And on the second lap round it
behaves -- the rail is one stop, 'Main, toolbar, Main menu, 1 of 5', and the arrows move. So the
first time through, the page is one kind of thing, the second time another. Inconsistent is worse
than steep. I'll use the skip link and not think about it, but my juniors would tab and get
lost there."

(Moderator note: this is the mock's generic keyboard layer making each rail button a Tab stop
before the screen's own region model has taken focus once; a mock defect, but it is what the
participant met.)

**Reload, skip link, Enter.**

"'Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
walk starts at TP53. Shift+Arrow: next neighbor. Space: select. Question mark: keys.'"

"Application region, so my reading keys are off -- but it told me on entry what the keys are,
and it told me where I start. TP53. The task says start at TP53 and it already has. I didn't ask
for that; I'll take it. It's a mouthful at my rate, about three seconds, but it's once."

"What it didn't say: how many edges, how many pieces. 33 of 300 nodes -- filtered by what? I'd
want that in the first sentence, or at least one key away. I'll come back to it."

**Arrow key, the way I'd try any drawing.**

"Right arrow. 'View moved. Shift+Arrow walks the graph.' Fine -- plain arrows pan, Shift walks.
It corrected me once and didn't make a fuss. Shift+Down, then, since the sheet I haven't read
yet probably says down is 'in'."

**Shift+Down.**

"'PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree 5, rank 247 of
300. Shift+Enter goes back, Esc ends the walk, Tab leaves the canvas, question mark lists the
keys.'"

"Name first. Good. 1 of 32 -- and TP53's degree is 32, so I'm seeing all of them. 'By weight,
highest first.' Weight of what? That's the edge, I assume, TP53 to PALB2. And PALB2 has degree
5. So PALB2 is the strongest link, not the best-connected neighbour. Best-connected to me means
degree. I need the neighbours sorted by degree, and I'm not going to press Shift+Right 32 times
and keep a tally in my head."

**Question mark.**

"'Keys, dialog.' Reading it in browse mode: 'On the canvas. Arrows, move the view. Shift+Down,
start the walk. Enter, open the inspector. Walking. Shift+Right, next neighbor ... O, order:
weight, degree, name.' There it is. 'Selection. Space, select or deselect this node.' 'Esc, end
the walk; again, clear the selection.' Short, one line per key, grouped. That goes in my text
file. Esc."

"'PALB2, 1 of 32.' It put me back where I was. Good."

**O.**

"'Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21, rank
7 of 300.'"

"So the best-connected neighbour of TP53 is UBC. Degree 21, rank 7 of 300. And it re-sorted
without throwing me back to TP53 -- I'm still one step out, now on the top of the new order.
That's what I wanted and it took one key."

"Now, 'score'. The moderator said 'tell me that neighbour's score'. There is no 'score' anywhere
in what I've heard. I have degree 21, rank 7 of 300, and weight 0.80, and the weight belongs to
the edge between TP53 and UBC, not to UBC. Earlier the side panel -- I heard it on the lap round
-- said 'edge weight, confidence'. So the tool has two words for the one number: 'weight' in the
walk, 'confidence' in the inspector. If a colleague says 'the score', I'd guess they mean that
confidence. I'm not guessing in my report. My answer: UBC, degree 21 in the full graph, rank 7 of
300; the TP53 to UBC edge has a weight -- confidence -- of 0.80. If 'score' means something else,
the tool never offered it."

"Also: is that degree 21 over the 300, or over the 33? Rank is 'of 300', so I think the 300. It
doesn't say. I'll find out in a second."

**Shift+Down, into UBC's neighbours.**

"'TP53, neighbor 1 of 3 of UBC in filtered graph, by degree, highest first. Weight 0.80, degree
32, rank 2 of 300, where you came from.'"

"'Where you came from.' Thank you. That's the thing every other tool forgets. And 1 of 3 'in
filtered graph' -- so UBC has 21 neighbours but only 3 are in this view. That answers the degree
question: degree is the full graph, the list is the filter. It should say that when it reads the
degree, not make me work it out from a mismatch, but it gave me enough to work it out."

"TP53 is where I came from, so it doesn't count as 'two of its neighbours' in my book. Skip it."

**Shift+Right, Space.**

"'NDUFS7, 2 of 3, weight 0.73, degree 9, rank 94 of 300.' Short form on the second step --
good, it doesn't repeat the 'by degree' bit. Space. 'NDUFS7 added. 1 selected on canvas. ] and [
step through the selection.'"

"'On canvas.' Why on canvas? Is there another selection somewhere that isn't on canvas? If the
table has its own, I need to know. Park it."

**Shift+Right, Space.**

"'RPL14, 3 of 3, weight 0.79, degree 7, rank 172 of 300.' Space. 'RPL14 added. 2 selected on
canvas.' Two of UBC's neighbours, selected. That's the task."

"Hm, one thing: in degree order, RPL14 at weight 0.79 comes after NDUFS7 at 0.73. That's
correct for degree order, I just note that the weight is read out every step whether or not it's
the thing I'm sorting on. Fine, it's the last number, I can cut it off."

**Checking my work: Enter, then Esc.**

"Enter. 'Inspector, RPL14, selected. Module Ribosome, degree 7, rank 172 of 300.' Esc. 'RPL14, 3 of
3.' Back in the walk exactly where I was. That worked twice in a row now -- the key sheet and the
inspector both put me back. That's the part I'd keep."

**Tab to the table.**

"'Nodes table, filtered graph, 33 rows, sorted by degree. NDUFS7, Complex I, degree 9, rank 94 of
300, selected. Row 17 of 33. 1 of 2 selected.' It landed me on my first selected row and told me
there are two. So the table's 'selected' is the same selection as 'on canvas'. Then the 'on
canvas' in the announcements is just noise -- or it's telling me something I can't decode. Either
way I can't tell the difference and I won't guess."

"Down arrow. 'RPS13, Ribosome, degree 9, rank 94 of 300. Row 18 of 33.' Esc, to get out of the
table --"

"'Selection cleared on canvas; Ctrl+Alt+Z: Previous selection.' Well. I pressed Esc to leave and
it threw away my two nodes. It did tell me, and it told me the way back, which is the only reason
I'm not angry. Ctrl+Alt+Z. 'Previous selection: 2 selected on canvas.' OK, recovered. But Esc
means 'get me out' in every dialog I've ever used, and here, in the table, it means 'delete my
work'. Tab leaves; Esc clears. I'll learn it. My juniors will lose their selection."

**Shift+Tab back to the drawing.**

"'Graph drawing, application ... 2 selected on canvas. The walk starts at NDUFS7.' So the walk
I built -- TP53, then UBC, then its neighbours -- is gone. Shift+Down: 'TP53, neighbor 1 of 2 of
NDUFS7.' Shift+Home: 'Start, NDUFS7.' Home is now NDUFS7, not TP53. Inside the walk I always knew
how to get back. The moment I Tab out to check the table, the way back is gone and home is
somewhere else. That's the one thing I said I judge a tool by."

## After the task

**Single Ease Question: 5 of 7.**

"The walk itself is the best I've heard for a graph. It speaks, names first, says where I came
from, sorts by degree in one key, and every place it sends me -- the key sheet, the inspector --
puts me back. I finished the task in about three minutes without asking anyone what's on the
screen. What costs it the two points: 'score' doesn't exist and 'weight' and 'confidence' are
the same number under two names; the first lap of Tab is a dozen dead stops; Esc in the table
clears my selection; and leaving the drawing loses my path and moves 'home'."

**Would I use this instead of my current tool?**

"For 'who is next to this clinic, and who is the biggest of them, right now, in a meeting' --
yes, possibly, and that's more than I've said about any graph tool. With NetworkX that's three
lines and I'd still be typing while everyone else is looking at the picture; here I'd be on the
answer and could say 'UBC' at the same time the sighted people point at it. For anything I report
-- ranked tables, numbers someone checks next quarter -- no. My scripts stay. And I'd still need
to hear the 'score' defined: what was computed, on the full graph or the filter, before I'd put
a number from this into a finding."

## Problems observed

1. **"Score" and "weight" and "confidence".** The task's word "score" matches nothing the tool
   says. The one candidate, the edge's weight, is called "weight" in the walk and "edge weight:
   confidence" in the inspector. Morgan had to reason that they are the same number and
   answered with two numbers to be safe. Severity 3.
2. **Tab before the skip link's region model.** On the first pass, Tab goes through twelve rail,
   chip, icon and list stops that answer no arrow key, then reaches the toolbar, where the
   screen's own one-stop-per-region model starts. On the second pass the same stops are one
   region each. Likely a defect of the mock's generic keyboard layer, but the participant cannot
   tell. Severity 2.
3. **Leaving the drawing loses the walk.** After Tab to the table and back, the walk restarts at
   the first selected node, and Shift+Home goes there, not to TP53. The path built inside the
   walk cannot be recovered. Severity 3.
4. **Esc in the table clears the selection** when the focused row is not selected. Announced,
   and undone with Ctrl+Alt+Z, but Esc is the key a screen reader user presses to leave.
   Severity 2.
5. **"On canvas" in every selection announcement** implies a second selection somewhere else;
   the table then reads the same selection with plain "selected". Morgan could not tell whether
   the two words mean different things. Severity 2.
6. **Degree's scope is not said.** "Degree 21" while "1 of 3 in filtered graph" left Morgan to
   infer that degree is counted on the full graph. The table header here says only "degree".
   Severity 2.
7. **No heading reaches the drawing or the table**, and the entry reading gives node counts but
   not edge or component counts (those are only in the inspector). Severity 1.
