# Session: keyboard walk -- Expert Emma

**Participant.** Emma, network scientist. Lives in Jupyter with networkx and igraph, uses Gephi for
the final figure. Keyboard-first where she can be; no assistive technology.

**Task as given by the moderator.** "Without a mouse, find Javert, move through the characters he
is connected to, and select two of them."

**Pages used.** The working keyboard mock (screens/keyboard-walk.html, participant view), driven by
real key presses in a browser; the inspector as it appears inside that mock after a selection; the
keyboard storyboard (storyboards/keyboard-only.html), which renders as a blank white page in the
participant view.

**Outcome.** Failure on the task as worded, for the second time: the only graph these pages load is
the protein network, and there is no Javert in it. She ran the same walk on TP53 to judge the keys,
and that part worked first time with no wrong turns.

---

## Think-aloud

**1. The storyboard.** Blank white page. "Nothing. Either it did not load or there is nothing to
see. Moving on."

**2. The keyboard mock loads.** "'Protein interactions', 33 of 300. TP53 in the middle, the usual
hub-and-spoke. Graphs list: one row, ppi-core-300, 300 nodes. You asked for Javert. Javert is Les
Miserables. There is no Les Miserables here. Same as last time, if I remember right."

**3. Tabbing in.** Tab. The first real stop is a link: "Skip to the graph drawing. F6 moves between
regions."

"Oh, that is new, or I missed it before. It says what it skips to. Good -- I will take it." Enter.
Focus lands on the drawing: "Graph drawing. Protein interactions, 33 of 300 nodes shown. Nothing
selected."

"One Tab and one Enter. Last time I counted thirteen Tabs. That is the fix I asked for."

(Out of curiosity she tabbed the long way later: Main menu, Graph, Data, Results, Notes, Assistant
are still six separate stops, then the filter chip, the Graphs search, the plus, the graph row, the
Sets plus, and the toolbar. "Still a Tab per rail icon. Should be one stop with arrows inside. But
with the skip link I no longer care much.")

**4. Ctrl+K, "Javert".** One row: 'Find "Javert" -- nodes, sets, styles and more, in Find'. Footer:
"Enter: Go to selects nothing. This mock lists the selection and set commands only."

"No exact match, so it offers to search. Fine, it is not lying to me."

**5. Ctrl+F, "jav".** "No nodes match 'jav'."

"And there it is. But -- no nodes match where? I have a filter on: 33 of 300. Did it search the 33 I
can see or all 300? That matters. If Javert were in the file but filtered out, 'no nodes match' would
be the wrong answer, and I would go and reload the file for nothing. It should say 'none of 300' or
'none in the 33 shown, 2 hidden by the filter'. For this dataset it does not matter, because this is a
protein file. I cannot do your task. In a real session I would stop and ask which file you meant."

**Moderator (per protocol, no hint about the product):** "Do what you would do."

"Then I check whether the keys work, because if they do, the wrong file is your problem, not the
tool's. TP53 plays Javert."

**6. Plain Down arrow, out of habit.** "View moved. Shift+Arrow walks the graph."

"Same as before, and still right: it tells me the arrows pan and what to press instead. I would have
guessed arrows walk. One correction and I have it."

**7. The key sheet, '?'.** The Keys panel: Everywhere (Ctrl+F, Ctrl+K, F6, ?), Graph drawing
(arrows move the view, Shift+Down into neighbors, Shift+Right / Left next and previous neighbor,
Shift+Enter or Shift+Up back, Shift+Home to the start, O order, Enter select, Space toggle, ] [ step
through the selection, Alt+Enter the inspector, Esc ends the walk, Tab to the table).

"A reference card. That is what I want. Read only, so no rebinding -- fine for me."

**8. Ctrl+K, "TP53", Enter.** "Walking the drawing. TP53, start of the walk, not selected. Degree 32,
rank 2 of 300, module DNA repair. Nothing selected on canvas."

"Go-to does not select. Correct. If Javert were in the file, this is how I would have found him:
Ctrl+K, name, Enter. That half of the task is fine -- on the right file."

**9. Shift+Down.** "PALB2, neighbor 1 of 32 of TP53, by confidence, highest first. Confidence 0.98,
degree 5, rank 247 of 300."

"It says 'confidence' now, not 'weight'. That is the column name in this file. Good -- it names the
thing. On Les Mis I would expect 'co-appearances'. Default order is by edge value; for a character
walk I want degree."

**10. O.** "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, confidence 0.80, degree
21, rank 7 of 300." The card at the bottom shows Confidence / Degree / Name with Degree outlined.

"It restarted the list at 1 when the order changed. Correct; otherwise 'neighbor 4' would mean
nothing."

**11. Shift+Right, Enter.** "RPS8, 2 of 32 ... RPS8 selected. 1 selected on canvas. ] and [ step
through the selection." Ring round RPS8; the table row RPS8 goes blue; the right panel changes to
the selection.

**12. Shift+Right, Enter.** "BRCA1, 3 of 32, confidence 0.71, degree 13, rank 16 of 300 ... BRCA1
selected. 2 selected on canvas."

"Enter adds, it does not replace. It said '2 selected' out loud and in the card. That is the part of
the task that matters, and it is done in two keys."

**13. The inspector (right panel, 2 selected).** Attributes: module Mixed, degree Mixed. Selection 2:
RPS8 17, BRCA1 13.

"Still no header on those numbers. 17 and 13 -- degree, presumably, because they match the table.
But I said this last time. A bare number next to a name is exactly what a junior copies into a slide
as 'the score'. Put 'degree' over it."

**14. Alt+Enter.** Focus goes to the inspector, which now reads "BRCA1, selected, Node, module DNA
repair, degree 13, #16 of 300."

"Hm. I had two selected, I pressed 'the inspector', and it shows me one. It jumped to the node I was
standing on. Is my selection still two? The drawing says yes, both rings are there. So this is 'inspect
the node under the cursor', not 'inspect the selection'. The key sheet says 'Alt+Enter the inspector',
which I read as the panel as it was. One of those two should change. Esc brought me back to the
drawing with 2 still selected, so nothing was lost."

**15. A second pass, to try the rest of the keys.** Skip link, Shift+Down (PALB2), Shift+Right (RPA1),
Shift+Down again: "RAD50, neighbor 1 of 3 of RPA1 in filtered graph."

"'Of 3 in filtered graph' -- RPA1 has degree 7, and it tells me only 3 are visible. That is the
honest version. Exactly what the Find message in step 5 was missing."

Shift+Up: "Back to RPA1, neighbor 2 of 32 of TP53." Shift+Home: "Back to TP53." Then Shift+Down put
me on RPA1 again, "neighbor 2 of 32", not neighbor 1. "It remembered where I was in TP53's list.
Probably useful. It did not say so, and the first time I expected to start over."

Space on RPA1: "RPA1 added. 2 selected." ]: "RAD51, selected 3 of 3." Tab: "Nodes, filtered graph"
-- the table. F6 cycles regions. "All of it behaves the way the sheet says. I have no complaints about
the keys."

**16. Ranks.** "Rank 247 of 300 at degree 5, rank 172 at degree 7: ties share a rank and the next one
skips. Standard competition ranking. Say so in the column header or the docs; networkx users will
expect a dense rank or no rank at all."

---

## Single Ease Question

**3 out of 7.**

"On the task you gave me: I could not find Javert because he is not in the file, and the search did
not tell me whether it looked past the filter. That is a fail, and I am not going to rate a task I
could not do as easy. If you asked me about the walk itself on TP53, I would give it a 6: one Tab,
one Enter, Shift+Arrow, Enter twice, and it told me the count at every step. It loses the seventh
point for the unlabelled numbers in the selection list and for Alt+Enter showing one node when I had
two. Fix the file and I expect this task to be a 6."

## Would she use it instead of her current tool?

"For keyboard walking, I have nothing to compare it to -- Gephi has no keyboard navigation at all,
there has been an open request for years. So yes, for looking around a graph this beats what I have,
and it beats it by a lot.

But I do not walk graphs from the keyboard to do analysis; I do that in the notebook with
G.neighbors('Javert'). Where this matters to me is the hand-off: the investigator or the biologist
I send a view to, some of whom work without a mouse or with a screen reader. For them, this is the
first graph tool I have seen that I would not have to apologise for. That is the reason I would use
it. Not instead of networkx -- instead of sending them a PNG."
