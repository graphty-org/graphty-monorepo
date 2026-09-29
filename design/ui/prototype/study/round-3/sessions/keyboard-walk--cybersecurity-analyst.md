# Session: keyboard walk from TP53 -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona in
`study/personas/cybersecurity-analyst.md`). Keyboard-first by habit, low patience for friction.

Task as the moderator gave it: "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

Screens: `screens/keyboard-walk.html` (played with real key presses, no mouse, from the page's
initial state), then the inspector and the Nodes table on the same page. Renders of the moments
that matter: `shots/keyboard-walk--s1.png` (canvas focused), `shots/keyboard-walk--s2.png`
(walking), `shots/keyboard-walk--s9.png` (two selected). The live page now shows a larger focus
pill with a "Neighbors by Weight / Degree / Name" switch that those older renders do not have; the
notes below describe the live page.

Outcome: success, with two stumbles. Time on task about four minutes, a minute of it on the first
two stumbles.

## Transcript

**Before starting.** "Protein data. Fine, not my network, so I can't sanity-check it against
anything I know. Left rail says 'Assistant -- Off. Nothing is sent.' Good. That's the first thing
I'd want to know and it's just sitting there. I didn't have to ask."

**Getting to the graph.** "No mouse. My hand goes to slash first, that's search in half the tools
I use." Presses `/`. Nothing. Presses `Ctrl+F`. The browser's find would open in real life; in the
mock nothing. "OK, so no search on slash. I'm not going to find TP53 by typing, then. Tab it is."

Presses Tab. (The first three stops are the mock's own grey tab strip, which is not the product;
the moderator told her to ignore it.) Fourth Tab: a link appears top left, "Skip to the graph
drawing. F6 moves between regions."

"Oh, a skip link. That's nice, actually. I'd have tabbed through every rail icon otherwise." Enter.

The drawing gets a blue outline and a small card over the toolbar: "Start: TP53 -- the walk
starts here. Degree 32, rank 2 of 300. DNA repair. Neighbors by Weight | Degree | Name, O.
Shift+Arrow: next neighbor. Space: select. ?: keys."

"It's already on TP53. Did it know? ... Rank 2 of 300 -- it just starts at the biggest node on
screen. Lucky for me. If you'd asked me to start at some leaf I'd have had no idea how to get
there without a mouse or a search box. That's the part I'd worry about with my own data: I always
start from a known host, never from the biggest one."

**Starting the walk.** "Shift+Arrow. Which arrow? It says next neighbor, so right." Presses
`Shift+Right`. It starts the walk.

Card: "PALB2, 1 of 32 from TP53. Weight 0.98. Degree 5, rank 247 of 300."

"PALB2, degree 5. That's not best-connected, that's the strongest edge. It's sorted by weight --
the 'Weight' pill is lit. I want most connections." Sees `Degree` in the switch and the `O` key
next to it. Presses `O`.

Card: "UBC, 1 of 32 from TP53. Weight 0.80. Degree 21, rank 7 of 300. Unassigned. Nothing
selected." UBC gets the focus rings on the drawing.

"There. UBC, degree 21. Rank 7 of 300. And the table underneath agrees -- UBC, 21, rank 7, second
row. Good, the numbers match across two places; that's the first thing I check."

**The score.** Moderator: "What's its score?"

"Depends what you mean by score. It shows me two numbers: weight 0.80, which I guess is the
confidence on the TP53-UBC edge, and degree 21. If 'score' means how connected it is: 21. If you
mean the edge: 0.80. The card doesn't call anything a score. I'd say 21, and I'd write 'degree' next
to it in my notes so nobody reads it as a risk score." She answers "21, degree", and adds "weight
0.80 on the link".

"'Unassigned' -- that's the module colour, it's grey. OK."

**Selecting two of UBC's neighbours.** "Now its neighbours. Down again goes one level deeper, I
assume." `Shift+Down`.

Card: "TP53, 1 of 3 from UBC, in filtered graph. Weight 0.80. Degree 32."

"Wait. I'm back on TP53? I pressed down, it went up." Pause. "Oh -- TP53 is one of UBC's
neighbours. Of course it is, I came from there. It's sorted by degree and TP53's the biggest, so
it's first. Annoying, though. The screen reader line up top says 'where you came from', but the
card on the drawing doesn't. I'd have liked it on the card."

"And '1 of 3'. UBC has degree 21, it said so ten seconds ago. Three? ... 'in filtered graph'. The
top-left says 33 of 300, so there's a filter on and only three of the 21 are drawn. Fine, it told
me, but it's small grey text after the number. If this were an account with 21 hosts and it said
'1 of 3' I'd have stopped and gone to check whether the tool dropped rows. That's the kind of count
that makes me not trust a screenshot."

"I don't want TP53, that's cheating, it's where I started." `Shift+Right`. "NDUFS7, 2 of 3, degree
9." `Space`. Card: "selected", "1 selected on canvas". Rings on NDUFS7. The inspector on the right
switches to NDUFS7.

`Shift+Right`. "RPL14, 3 of 3." `Space`. "2 selected on canvas." The inspector reads "2 selected",
lists NDUFS7 and RPL14 with their degrees. The table highlights their rows.

"Done. Two of UBC's neighbours, NDUFS7 and RPL14, both show in the right panel with their degrees.
That I like -- the selection is a list, not just rings on a picture."

**After the task, looking around.** Presses `?`. A keys dialog opens: walk keys, Space to select,
`]` and `[` to step through the selection, "Esc: end the walk; again, clear the selection", Tab to
the Nodes table. "OK, that's a real key sheet. I'd have read this first if I'd known about it -- the
card does say '?: keys', I just didn't read the last line." Esc.

Presses `Enter` on a node out of curiosity: the inspector takes focus on that node, Esc comes back.
"Fine."

"Could I have done this from the table? Tab to the table, it's sorted by degree... but the table
doesn't know who TP53's neighbours are. The walk is the only way to get 'neighbours of X' by
keyboard. That's the pivot. That's the bit that's actually useful."

## Single Ease Question

**5 of 7.** "Once I was on the walk it was quick: O to sort by degree, arrows, space. What cost
me was the start -- slash did nothing, I only got to TP53 because it happened to be the biggest
node -- and then the 'back to TP53' moment and the 3-versus-21 count. None of that is fatal. A second time I'd do it in
thirty seconds."

## Would she use it instead of her current tool

"For this -- pivoting from one thing to its neighbours and picking some -- it's better than what I
have. BloodHound makes me click every node, and the Sentinel graph just dumps everything on me in
no order. Here I can say 'sort the neighbours by degree' with one key and walk down them. That's the
thing I actually want: which of these do I look at first.

But I start from a host I already know, not from whatever's biggest. If I can't type 'FIN-WS-0412'
and land on it with the keyboard, I'm not using this -- I'd be back in Splunk. And I still need the
two I selected out as rows. So: interested, not switching. Show me search-to-node on slash and a
CSV of the selection and I'll try it on a lab dataset."

## Problems

1. **No keyboard way to start from a named node.** `/` and `Ctrl+F` do nothing; the walk always
   starts at the highest-degree drawn node. The task only worked because TP53 happens to be that
   node. Severity 3.
2. **"Best-connected" needs a key the user has to discover.** The walk opens sorted by edge weight,
   so the first neighbour offered (PALB2, degree 5) is the least connected-looking. The `O` switch
   is on the card and she found it in seconds, but only because the word "Degree" was visible.
   Severity 2.
3. **Stepping into a neighbour's neighbours lands on the node you came from.** In degree order the
   origin is usually first; the card does not say "where you came from" (only the screen reader
   line does), so it reads as the walk going backwards. Severity 2.
4. **"1 of 3" beside "degree 21" looks like dropped data.** The "in filtered graph" qualifier is
   small secondary text after the count. A count that does not match the degree shown a moment
   earlier is exactly what makes her distrust a tool. Severity 2.
5. **"Score" is not a word the screen uses.** Two numbers are shown (edge weight 0.80, degree 21);
   she had to pick one and annotate it. Mostly the task's wording, but the card gives no hint which
   one is "the node's number". Severity 1.

What worked: the skip link on the first real Tab stop; the "Assistant -- Off. Nothing is sent."
line; Shift+Right starting the walk as well as Shift+Down; one key (O) to reorder neighbours by
degree; the degree and rank on the card matching the Nodes table; the inspector listing the two
selected nodes by name with their degrees.
