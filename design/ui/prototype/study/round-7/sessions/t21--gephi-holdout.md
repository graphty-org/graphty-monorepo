# Session: two-line labels on the bishop's circle -- Gephi holdout (Dr. Mara Lindqvist)

Task as given by the moderator: "Have each character in the circle around the bishop carry two
pieces of text in the drawing: what they are called on top, and underneath it how many remarks
have been written about them. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t21/01.png. Renders: tmp/round-7-sessions/t21--gephi-holdout/NN.png.
Every command was run from design/ui/prototype; `--try <png> task:t21` is abbreviated as `try NN`.

## Transcript

**Start (t21/01.png).** "The bishop is Myriel, top right, with his little star of neighbors. So I
need labels on him and his lot -- name on top, number of notes underneath. In Gephi that's a
label column in Preview, and the second line I'd do in Inkscape, honestly."

**01** `try 01 --click "Myriel"`
Clicking the name selected the "Myriel to Javert" path row in the tree, not the node. "That's a
shortest path, not the bishop. Fine, the search clicked the first thing with his name in it."

**02** `try 02 --click "Louvain"`
A community table opened at the bottom: six communities with size, density, edges inside and
leaving. "Now that's a Data Lab for modularity classes, I like that. His household is about ten
people with few ties outside -- Community 3, size 10, three edges leaving. That's my guess."

**03** `try 03 --click "Louvain" --click "Community 3"`
Panel: Community 3, "Paints 10 nodes", "Covered for Color by PageRank". "So I can't actually see
which ten. PageRank is painted on top. I want to see the members before I put labels on them."

**04** `try 04 ... --click "Data"`
Went to the left rail's Data section instead of the panel's Data tab. "Wrong Data. Two things
called Data on one screen. At least it shows the attributes: label, group, degree, betweenness.
No note count column, so that number has to come from the notes."

**05** `try 05 ... --click "Label"` -- nothing happened. "The word isn't a button."
**06** `--hover "Add label"` -- nothing on screen is called that.
**07** `--click "Add Label"` -- nothing on screen is called that.
**08** `--click "Add"` -- opened the Shape menu (Shape, Size). "Wrong plus."
**09** `--hover "Add"` -- tooltip "Add to Shape". "So it's 'Add to Label'. Four tries to find a
plus sign."

**10** `try 10 --click "Louvain" --click "Community 3" --click "Add to Label"`
Menu: "Label line", "Show labels". "I want two lines, so 'Label line'."

**11** `... --click "Label line"`
A row "Above" with "Pick a field", and a picker with node attributes, results, and a Notes
section holding "Latest note" and "Note count". "Note count -- there's my number. Good that it's
there without me computing it."

**12** `... --click "label"`
My click sorted the table's label column instead of picking from the menu. Field still empty.
"The picker and the table both say 'label'. It took the table."

**13** `... --click "Name, Label"`
Above now reads "Abc label". "But nothing appeared on the drawing near Myriel. No new names."

**14** `... --click "Add to Label"` -- a "Below" row opened straight into the picker. "That's the
right shape: above and below."

**15** `... --click "Note count"`
Panel: Above = label, Below = Note count. Canvas unchanged -- no labels, no numbers anywhere in
the bishop's cluster or elsewhere. "The panel says it's done. The picture says nothing happened."

**16** `... --click "Add to Label" --click "Show labels"`
"Show labels" is no longer in the menu; the plus just added a third line, "Right". "So where is
the switch that actually draws them?"

**17** `... --hover "Hide"` -- tooltip on Community 3's eye: "Hide Community 3, Alt-click: show
only this row." "I want to hide PageRank so I can see who's green."
**18** `... --click "Hide PageRank"` -- nothing on screen is called that. The eye only exists on
the row I'm on.

**19** `... --click "Paints 10 nodes"`
Panel switched to "5 nodes" with a "Why this look" list: Notes (Label below, 2 of 5), PageRank,
Degree, Group 2 (Label above, 1 of 5), Selection, Everything. Community 3 not listed. "It said ten.
I click it and it says five. And my community isn't even in the list of reasons. That is a count
I can't explain, and I don't publish counts I can't explain."

**20** `... --key Escape --click "Community 1" --click "Community 3"`
Escape put everything back to the start screen (PageRank selected, Louvain collapsed).

**21** `... --key Escape --click "Louvain" --click "Community 3"`
Community 3's Label section is empty again. "Gone. Either Escape threw it away or it was never
applied. Either way, three dead ends on labels. I'd have been done in Gephi by now."

## Outcome

**Did I succeed?** No. I got the panel to say "label above, note count below" on Community 3,
but the drawing never showed it, I never confirmed Community 3 is actually Myriel's circle
(PageRank paints over the community color and I could not hide it), "Paints 10 nodes" turned
into "5 nodes" when clicked, and the setting was gone when I came back.

**Single Ease Question:** 2 of 7.

**Would I use this instead of Gephi?** No. The pieces I want are here -- a community table,
note count as a field, above/below label lines, which is more than Preview gives me without
Inkscape. But I set something, the picture did not change, and when I came back it was gone. I
need the canvas to show what the panel says, and a count that stays the same when I click on it.
I'd stay on Gephi.

## What got in the way (participant's words, summarized)

- No way to get from "the bishop" to "his circle": clicking his name hit a path row; there was no
  obvious "select his neighbors".
- Could not verify which ten nodes Community 3 holds: PageRank covers the color, and the eye to
  hide PageRank only appears on the selected row.
- The + buttons are unlabeled; took four tries to find "Add to Label".
- "label" in the field picker vs. "label" column in the table; "Data" tab vs. "Data" rail.
- Label lines set in the panel never appeared on the canvas.
- "Paints 10 nodes" link led to "5 nodes" with no explanation.
- Escape discarded (or revealed as unsaved) the label setting.
