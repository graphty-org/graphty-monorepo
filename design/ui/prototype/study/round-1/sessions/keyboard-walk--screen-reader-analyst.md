# Keyboard walk -- Morgan Reyes, screen-reader analyst

**Task, as the moderator gave it:** "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

**Page:** screens/keyboard-walk.html (the protein interaction network, filtered to 33 of 300
nodes). The mock was driven with real key presses in Chromium; every quoted announcement below is
what the page's live region or focused element produced for that key. The inspector and table
mocks were not needed to finish: the walk page carries its own table and inspector.

**Outcome:** finished, with one wrong turn (an extra node in the selection that had to be taken
out) and two interpretations the task left open ("best-connected", "score").
**Single Ease Question:** 5 of 7.

---

## Transcript (think-aloud, Morgan's voice)

**Page title.** "Keyboard walk on the protein network." Fine. Now H for headings... "No next
heading." Nothing. No headings at all. Not one. That is the first thing I check and it is already
a mark against it. I'll read with Tab and the arrows like my juniors would.

**Tab, Tab, Tab, Tab.** "Gallery, link." "Shift+Up." "Alt+Up." A checkbox. That's your test
harness, the moderator says, ignore it. OK.

**Tab.** "Tools, toolbar. Select, pressed, 1 of 5." So the first thing in the actual app is a
toolbar. I skipped a left panel and whatever is on the right to get here -- I only find that out
later when F6 wraps round to "Main, toolbar". Odd order, but it reverses cleanly with Shift+Tab,
which is more than most.

**Tab.** "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing
selected. Shift+Arrow walks the graph." Then the description: Shift and arrows walk, Esc ends,
Tab leaves, F6 moves between regions. Good. An application region that tells me how to get out
before I'm in. I'll write that down. 33 of 300 shown -- shown by what filter? It doesn't say. Park
that.

**Right arrow** (my habit, see if it's alive). "View moved. Shift+Arrow walks the graph." Alive,
and it told me the right key without scolding me. Once. Good.

**Shift+Down.** "PALB2, neighbor 1 of 32 of TP53, by confidence 0.98. Degree 5, rank 247 of 300.
Shift+Up goes back, Esc ends the walk, Tab leaves the canvas."

Hm. I never told it TP53. It started there on its own. The moderator said start at TP53 and I
got TP53, but I got it by luck -- I only learn where I started from the word "of TP53" at the end
of the first neighbour. If you'd asked me to start at BRCA1 I'd have had to go find BRCA1 in the
table first and select it. It should say "starting at TP53" before it moves me anywhere.

Otherwise: name first, position, the ordering it's using -- "by confidence" -- and degree. That's
the right order at my speed. 32 neighbours ordered by confidence. But you asked me for
*best-connected*. To me that's degree, not the edge confidence. The walk doesn't sort by degree.
So I'm going to have to listen to all 32 and keep a running maximum in my head.

**Shift+Right, 31 times.** "RPA1, 2 of 32, 0.95. Degree 7, rank 172 of 300." "RAD51, 3 of 32,
0.87. Degree 5." "RPA2 ... Degree 11." "FANCD2 ... Degree 12." ... "UBC, 8 of 32, 0.80. Degree
21, rank 7 of 300." There we go, 21, that's my leader. Keep going to make sure. ... "WRN ... 13",
"BRCA1 ... 13", "PSMC6 ... 12" ... "RPS8, 32 of 32, 0.42. Degree 17, rank 11 of 300." "Last
neighbor."

So UBC, 21. RPS8 second at 17. Two things. After the first one it drops the word "confidence" and
just says "0.80". I know what it is because I heard it once, but a bare 0.80 next to a degree is
exactly the kind of number I stop demos for. Second: that took 32 announcements and my working
memory. In NetworkX that's one line: `max(G[ 'TP53' ], key=G.degree)`. There's no "sort
neighbours by degree" here, no "jump to highest".

**Cross-check in the table.** I want a second source. Tab ends the walk and lands me in the
table: "Nodes table, filtered graph, 33 rows, sorted by degree. TP53, DNA repair, degree 32, rank
2 of 300. Row 1 of 33." Down arrow: "UBC, Unassigned, degree 21, rank 7 of 300. Row 2 of 33."
Thirty-three rows, TP53 has 32 neighbours, 32 plus 1 is 33 -- so this filter is probably "TP53
and its neighbours", and the table sorted by degree answers the question in one key press. But
nobody told me that's what the filter is. I worked it out from arithmetic. If I'd started here I
would have been done in ten seconds, and I'd still not be sure it was the neighbourhood.

**Back to UBC in the walk.** Shift+Tab to the drawing, Shift+Down again, and I'm at PALB2. Seven
Shift+Rights to UBC. (First time I did it I was sitting on "Last neighbor" and pressed Shift+Left
24 times. I tried typing U to jump; nothing happened, silently.) "UBC, 8 of 32, 0.80. Degree 21,
rank 7 of 300."

**Answer for the moderator:** "Best-connected neighbour of TP53 is UBC, degree 21, seventh
highest of 300 in the whole graph. If by score you meant the confidence on the TP53 to UBC
edge, it's 0.80. Nothing on this screen is called score, so I'm giving you both." I'd count that
as my one question to the moderator, and I didn't even get to ask it -- the tool uses "degree",
"rank" and "confidence", your task says "score", and I'm guessing.

Also: rank 7 of 300. Is that rank by degree? Ties how? Three nodes at degree 5 all say rank 247.
Fine, minimum rank for ties, I assume. It doesn't say.

**Enter on UBC.** "UBC selected. 1 selected on canvas." I pressed Enter because I wanted to mark
where I was. That turns out to be a mistake, see below.

**Shift+Down from UBC.** "TP53, neighbor 1 of 3 of UBC in filtered graph, by confidence 0.80.
Degree 32, rank 2 of 300, where you came from." Oh, that's nice. "Where you came from" is
exactly what I need when I'm two hops out. And "in filtered graph" -- UBC has degree 21 and I'm
only seeing 3 of them. It told me so, instead of letting me think UBC has three neighbours. Good.

I won't pick TP53; it's where I came from and the moderator would argue about it. **Shift+Right.**
"RPL14, 2 of 3, 0.79. Degree 7." **Space.** "RPL14 added. 2 selected on canvas. ] and [ step
through the selection."

Two selected. Wait. I've selected one neighbour and it says two. Oh -- UBC is still selected from
the Enter. So Space adds, Enter replaces. That's consistent, it's my fault, but the message
"2 selected" was the only thing that saved me. It doesn't say *which* two.

**Shift+Right, Space.** "NDUFS7, 3 of 3, 0.73. Degree 9." "NDUFS7 added. 3 selected on canvas."

Now I have three and want two. **[** "RPL14, selected 2 of 3." **[** "UBC, selected 1 of 3."
**[** again: "UBC, selected 1 of 3." Same sentence twice -- is that the start or did the key not
work? It should say "first". **Space.** "UBC removed. 2 selected on canvas."

**] ]** "RPL14, selected 1 of 2." "NDUFS7, selected 2 of 2." That's my list, and I can read it
back without leaving the drawing. That, I like.

**Shift+Up, Shift+Up, Shift+Up** to check the way home: "Back to UBC, neighbor 8 of 32 of TP53."
"Start, TP53." "At the start, TP53." I know where home is and it tells me when I'm there. That is
the thing every other tool got wrong.

**Tab into the table to confirm.** "Nodes table, filtered graph, 33 rows, sorted by degree.
RPL14, Ribosome, degree 7, rank 172 of 300, selected. Row 27 of 33. 1 of 2 selected." Same
selection in the table, and it put me on the selected row. Good.

**The inspector.** F6, F6: "Export..., button." Tab: "Inspector. Select neighbors, button, 1 of
9." Down arrows: "Filter to, button." "Create set, button." "More actions, menu button."
"module, mixed." "degree, mixed." And then, on an earlier try with three selected: "less than
span class equals quote k-id quote greater than UBC less than slash span greater than, degree
21." It read me the HTML. Literally the markup. One panel that doesn't talk properly and I'm back
to copying things into Notepad. And "degree, mixed" -- mixed is not a number. Give me the range.

Also, "Select neighbors" in the inspector would have given me all three of UBC's neighbours plus
UBC, not two. So the walk was the only way to pick exactly two.

---

## After the task

**Single Ease Question: 5.** The walk itself is the best keyboard graph navigation I've been
handed: it talked on the first arrow, told me how to get out, told me where I came from, and
Shift+Up always got me home. It loses points for making me hold 32 degrees in my head to answer a
"best-connected" question, for starting at TP53 without saying so, for "score" meaning nothing on
the screen, for the Enter-versus-Space trap, and for the inspector reading me raw HTML.

**Would I use this instead of my scripts?** Not instead. For the manager's "who's connected to
this clinic, and through whom?" question -- yes, maybe, if the real thing behaves like this and
the inspector stops reading markup. Walking out from a node and back, with "where you came from",
is something my scripts don't give me; I print edge lists and reconstruct it in my head. For
"which neighbour has the highest degree", no: that's one line of NetworkX and here it was 32
key presses, or a table whose filter I had to reverse-engineer. And before any of it goes near an
agency laptop, someone tells me where my file goes when I load it.

---

## Problems observed

1. **Inspector reads raw HTML** -- with more than one node selected, each selection row's
   spoken name is the markup `<span class="k-id">UBC</span>, degree 21`. Severity 3.
2. **No way to order or jump the walk by degree** -- "best-connected neighbour" needed all 32
   neighbours heard and a running maximum held in memory; the walk orders by confidence only and
   typing a letter does nothing. Severity 3.
3. **The walk's start node is never announced** -- focusing the drawing says "Nothing selected",
   and Shift+Down moves straight to the first neighbour; TP53 is learned only from "of TP53". A
   different start node needs a trip to the table first. Severity 2.
4. **The filter is not named** -- "filtered graph, 33 of 300" everywhere, never what the filter
   is; the reader had to infer "TP53 and its neighbours" from 32 + 1 = 33. Severity 2.
5. **Enter replaces, Space adds, and the count does not say which** -- Enter on UBC to mark the
   place left UBC in the selection; "2 selected on canvas" after one Space was the only clue.
   Severity 2.
6. **"Confidence" is dropped after the first step** -- later steps say a bare "0.80" beside the
   degree. Severity 1.
7. **No headings on the page** -- H finds nothing, so a heading-first reader starts blind.
   Severity 2.
8. **"degree, mixed"** in the inspector for a multi-selection gives no range or values.
   Severity 1.
9. **"[" at the first selected node repeats itself** instead of saying it is the first.
   Severity 1.
10. **Tab order enters the app at the toolbar**, skipping the left panel and the inspector, which
    are only found by F6 wrapping round. Severity 1.
11. **"Score" is not a word the screen uses** -- the tool says degree, rank and confidence.
    This is partly the task's wording, but the tool offers no definition to settle it.
    Severity 1.
