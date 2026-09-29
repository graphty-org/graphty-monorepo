# Session: keyboard walk -- Priya, SOC threat hunter

**Participant.** Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Keyboard-heavy, dark mode, reads numbers and skims
everything else, distrusts counts she cannot reconcile.

**Task, as given by the moderator.** "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

**Screens.** The keyboard walk mock (`screens/keyboard-walk.html`) driven with real key presses in
dark mode at 1440 by 900; the inspector (`screens/inspector.html`) and bottom dock table
(`screens/table-dock.html`) renders looked at for comparison. The magenta strip above the frame is
labelled "Screen reader says (not part of the screen)"; where Priya relied on it, that is called out,
because a sighted user of the real product would not have it.

**Outcome.** Finished, with one wrong turn: she ended up with three nodes selected instead of two and
fixed it from the table. Answer given: UBC, degree 21 (rank 7 of 300). Roughly 4 minutes.

---

## Transcript

**Opening.** "Protein interactions. OK, this isn't my data, so I can't sanity-check it against
anything I know. I'll take your word that TP53 is a thing. Same three questions as always -- is it
approved, where does it run, does it phone home -- nothing on this screen answers them, but fine,
it's a study."

"No mouse. First thing I do in any tool is slash or Ctrl+F to get to search."

*Presses `/`.* Nothing happens. "Nothing. No search box lit up."

*Presses Ctrl+F.* (In her Edge this opens the browser's find bar.) "That's the browser's find, not
yours. It'd find 'TP53' in the table text but that doesn't put me anywhere in the graph. So there's
no 'go to node by name' from the keyboard? In BloodHound I just type the name."

**Tabbing in.** *Presses Tab repeatedly.* "Gallery link, some Shift+Up / Alt+Up toggle, an
Annotations checkbox -- that's your mock furniture, I'll ignore it." Fifth Tab: "Now I'm on the tool
buttons along the bottom. Odd that I land there first and not on the left menu." Sixth Tab: the
drawing gets a blue outline. "OK, I'm in the graph. Now what?"

"The pink bar up top says 'Tab to the drawing, then press Shift+Down.' I'll be honest, I only know
that because I'm reading the bar that says it's not part of the screen. On the real thing I'd have
had nothing."

*Presses plain Down arrow first anyway.* The whole drawing slides; the top row of labels (PSMC6,
PSMD14) gets clipped. "That moved the picture. I didn't want to move the picture, I wanted to move
to a node. The pink bar says 'View moved. Shift+Arrow walks the graph' -- again, only in the bar
that isn't real."

**Walking.** *Presses Shift+Down.* A ring appears on PALB2 and a little pill above the toolbar says
"PALB2 1 of 32 from TP53 | Shift+Up back".

"Good -- it started at TP53 without me telling it to. I guess because it's the biggest one? I didn't
pick it. Fine. '1 of 32', so TP53 has 32 neighbours. I asked for best-connected and it gave me
PALB2 first. PALB2 is a small dot. Why is that first?"

Reads the pink bar: "PALB2, neighbor 1 of 32 of TP53, by confidence 0.98. Degree 5, rank 247."
"So it's sorted by the link confidence, not by how connected the neighbour is. That's not what I
want. And none of that -- confidence, degree -- is on the pill. The pill just says the name and
'1 of 32'. If I'm sighted and don't have your pink bar, I'm stepping through 32 names blind."

*Presses Shift+Right seven times.* RPA1, RAD51, RPA2, FANCD2, LTBP1, MSH2, UBC. "Eighth one is UBC,
and the bar says degree 21, rank 7. That's the biggest so far. But I'm not doing 24 more of these to
prove it."

"The panel on the right still says 'Protein interactions, Graph, 33 of 300 nodes'. It didn't follow
me. So I can't see the degree of what I'm on unless I select it, and selecting it changes my
selection. That's backwards for 'look before you touch'."

**Going to the table instead.** "Forget the walk. There's a table under the picture, 'Sorted by
degree'. That's my Splunk move: sort, take the top row."

*Presses Tab.* Focus lands on the table, row TP53, degree 32. *Presses Down.* UBC, Unassigned,
degree 21, rank 7.

"Is this table the neighbours of TP53, or just some filter? The chip says '33 of 300' with a funnel.
Filtered on what? It doesn't say. TP53 has 32 neighbours, plus TP53 itself is 33 -- so I'm guessing
this is TP53 and its neighbours. That's arithmetic I shouldn't have to do. If the chip said 'TP53
plus neighbours' I'd trust it."

**Answer to the moderator.** "Best-connected neighbour is UBC. Score -- there's no column called
score. Degree 21, rank 7 of 300. If you meant the confidence on the TP53 to UBC link, that was 0.80,
but I only saw that in the pink bar. So: UBC, 21."

**Selecting two of UBC's neighbours.** "UBC's neighbours aren't in this table as a column, so I have
to go back to the picture." *Presses Enter on the UBC row.* Right panel now shows "UBC, Node, module
Unassigned, degree 21, #7 of 300". "Good, that's the panel I wanted a minute ago."

*Presses Tab* -- focus jumps to the left menu, not the picture. *Presses Shift+Tab* back to the
drawing. *Shift+Down.* Pill: "TP53 1 of 3 from UBC".

"Hang on. UBC has degree 21 and it's showing me 3 neighbours? Which is it? Twenty-one or three?"
Reads the pink bar: "neighbor 1 of 3 of UBC in filtered graph". "OK, 'in filtered graph' -- so 21 is
across the whole 300 and 3 is what's in this slice. The pill doesn't say that, the table doesn't
say that, the right panel doesn't say that. That's exactly the kind of count that makes me stop
trusting a tool. If I put 'degree 21' in a case note and my lead asks why the graph only shows three
lines, I look stupid."

"First one is TP53, where I came from. Skip it." *Shift+Right.* RPL14. *Space.* Ring on RPL14.
*Shift+Right.* NDUFS7. *Space.* Ring on NDUFS7.

Looks at the right panel: "3 selected -- UBC 21, RPL14 7, NDUFS7 9."

"Three. I said two. It kept UBC selected from when I hit Enter in the table, and Space just piled on.
Nothing on the pill told me I was adding to something. I'd have expected Space to start fresh, or at
least to see 'UBC selected' somewhere near where I'm looking."

**Recovering.** "How do I drop UBC without the mouse?" *Presses Esc.* Pink bar: "Walk ended. 3
selected on canvas." *Considers Esc again* -- "if that clears all three I'm starting over, no."
*Presses Tab* to the table: it lands on the UBC row, highlighted as selected. *Presses Space.* UBC
un-selects; right panel reads "2 selected -- RPL14 7, NDUFS7 9".

"There. Two of UBC's neighbours, RPL14 and NDUFS7. Done. The table was the part that behaved like
I expected every time."

---

## After the task

**Single Ease Question: 3 of 7.** "I got there, but only because I went around the walk to the table,
and I read a bar that isn't part of the product. The walk itself -- sorted by something I didn't ask
for, no numbers on screen, and Space silently adds to an old selection -- I'd have gotten this wrong
without the right panel."

**Would she use it instead of her current tool?** "Not for this. My current tool for 'who does this
account talk to most' is a Splunk search sorted by count, and it gives me the answer in one line.
The walk's idea is fine -- step through an account's hops without touching the mouse, I'd actually
like that for lateral movement -- but it has to show me the number on screen, let me pick the sort,
and in my world it has to walk in time order, not by confidence. And give me a box where I type
'TP53' or 'svc-backup' and land on it. The table I'd use. The walk, not yet."

---

## Problems observed

1. **The walk pill shows no numbers.** While walking, the visible pill shows only the node name and
   "n of N from X". Confidence, degree and rank appear only in the screen-reader strip. A sighted
   keyboard user cannot compare neighbours while walking. Severity 3.
2. **Walk order is by link confidence, with no way to change it.** "Best-connected" meant stepping
   through neighbours one by one; she abandoned the walk for the table. Severity 3.
3. **Space adds to an earlier selection with no visible warning.** Selecting UBC in the table and then
   pressing Space twice on the walk gave three selected, not two. The pill does not show that a
   selection already exists. Severity 3.
4. **Degree does not match the neighbours the walk shows.** UBC reads degree 21 in the table and
   inspector but "1 of 3" on the walk; only the screen-reader text says "in filtered graph". Nothing
   visible says the degree column is whole-graph and the walk is the filtered slice. Severity 3.
5. **The filter chip does not say what the filter is.** "33 of 300" with a funnel; she had to infer
   "TP53 and its neighbours" by arithmetic. Severity 2.
6. **No keyboard way to jump to a node by name.** `/` did nothing and Ctrl+F is the browser's find.
   The walk happened to start at TP53 only because it is the highest-degree node. Severity 2.
7. **Nothing visible teaches Shift+Arrow.** Plain arrows pan the view (and clip labels); the only
   hint lives in the screen-reader strip. Severity 2.
8. **The inspector does not follow the walk.** To see the focused node's attributes she had to
   select it, which changes the selection. Severity 2.
9. **Tab order surprises.** First Tab into the app lands on the canvas toolbar, not the left rail;
   Tab from the table goes to the left rail, so returning to the drawing needs Shift+Tab.
   Severity 1.
10. **"Score" had no match on screen.** The keyboard walk's inspector shows only module and degree;
    the separate inspector mock shows betweenness and PageRank. She answered with degree and hedged.
    Severity 1 (partly the moderator's wording).

**Mock limits noted, not counted as design failures.** The gallery link, back-key toggle and
Annotations checkbox at the top take the first four Tab stops; they are mock chrome, not product.
