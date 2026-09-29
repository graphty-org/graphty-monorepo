# First-click test: the Gephi holdout (Dr. Mara Lindqvist, fictional)

Answers were given from the screen image alone, in character, before the correct targets were
seen. Confidence is 1 (a guess) to 7 (certain). Scoring was added afterwards and the answers were
not changed.

## fc-1. A picture of the Les Miserables network for the paper (Les Miserables, at rest)

**Clicked:** the three-line button at the top left. Confidence 5.

"No Preview tab, so it has to be under File somewhere. The three lines is the only thing that
looks like a File menu. I want SVG, and if that menu only says PNG, we are done."

**Scored:** correct (main menu, File > Export...).

## fc-2. See how the earlier bridges calculation was set up (Les Miserables, at rest)

**Clicked:** Results on the left rail. Confidence 4.

"The only 'Bridges' on the screen is in the style stack, and that is paint, not the statistic.
In Gephi the parameters live in the statistics report. The flask called Results is the nearest
thing to a Statistics panel I can see, so I start there."

**Scored:** correct.

## fc-3. Rank the characters a second way (Les Miserables, at rest)

**Clicked:** Results on the left rail. Confidence 4.

"'Rank' to me means a ranking in the Appearance sense, but you mean another measure. The table
only has degree, so I need another statistic -- PageRank or betweenness -- and that is Results.
The lightning icon on the floating bar has no label; I would not touch it."

**Scored:** correct.

## fc-4. A stray click cleared the characters I had picked out (undo notice)

**Did:** pressed Ctrl+Z (Cmd+Z on my Mac). Confidence 5.

"Reflex. I made a mistake, I press undo, and I want to see whether undo covers a selection and
not just a text box. I did see 'Bring it back' on the black notice, but my hands were faster than
my eyes. If Ctrl+Z does nothing, I click the notice next."

**Scored, restore-with-Ctrl+Z design:** correct.
**Scored, notice-only design:** wrong (Ctrl+Z would not bring the selection back there).

## fc-5. Where Valjean's betweenness number comes from (Valjean selected)

**Clicked:** the betweenness row under Results in the right panel ("0.57, highest").
Confidence 5.

"It is sitting right there on the node. I click the number and I expect the method, normalized
or not, and directed or not. If it does not say, I check it against NetworkX myself."

**Scored:** correct.

## fc-6. Bring in next month's transfers file so everything carries over (Transfers, at rest)

**Clicked:** the three-line main menu. Confidence 4.

"File first, always. In Gephi I would import the spreadsheet and choose to append to the
workspace -- and I would expect to redo the appearance anyway. The chip with the file name is
tempting, but I do not know what it does."

**Scored:** correct (main menu, File > Update with new data...).

## fc-7. Accounts that take in far more money than they send out (Transfers, at rest)

**Clicked:** "Change..." on the Loaded line. Confidence 4.

"It says, in writing, 'amount not used yet'. That is weighted in-degree minus weighted out-degree,
and nothing weighted means anything until the amount is the edge weight. So the first thing I do
is make the amount the weight. Then I go to the statistics."

**Scored:** wrong (counted separately: 'Change...' on the Loaded line).

## fc-8. Cheapest route between two accounts, bigger transfer costs more (Transfers, at rest)

**Clicked:** "Change..." on the Loaded line. Confidence 4.

"Same problem. A cheapest path is a weighted shortest path, and the screen tells me the amount is
not being used. Gephi has a shortest-path tool on the canvas and it ignores weights, which has
burned me before. The route-looking icon on the bar is probably that tool, but it is unlabeled and
it would run unweighted. Weight first."

**Scored:** wrong (counted separately: 'Change...' on the Loaded line).

## fc-9. IT asks whether anything from this project has left my computer (Transfers, at rest)

**Clicked:** the underlined line under the project name, "Nothing has been sent from this
project". Confidence 6.

"That is the first thing I read on every screen, because half my data is under IRB terms. It is
underlined, so I expect it to open a list of what was sent and when. Nothing, I hope."

**Scored:** correct.

## fc-10. Ribosome and Spliceosome are two blues I cannot tell apart (Protein interactions, at rest)

**Clicked:** the Spliceosome swatch in the legend. Confidence 5.

"In Gephi I click the colour square in the partition list. This legend looks like that list, so
I click the square. And yes, those two blues would fail for my colour-blind students too."

**Scored:** correct.

## fc-11. Bring the lab's file of standard colours and sizes into this project (Protein interactions, at rest)

**Clicked:** the three-line main menu. Confidence 3.

"Gephi cannot do this at all, which is exactly why every figure in the lab looks different. If it
exists, it is an import, and imports are under File. I would not guess the palette icon; that is
the background."

**Scored:** correct (main menu, Recipes > Apply a recipe...).

## fc-12. How the Ribosome module differs from the rest of the network (Protein interactions, at rest)

**Clicked:** the "Full graph" filter button under the file name. Confidence 4.

"Filter to the Ribosome partition, look at the statistics, take the filter off, look again. That
is how I do it in Gephi, and I do it deliberately, because I want to know what the statistics ran
on. The button says Full graph, so that is where the filter is."

**Scored:** wrong (a filter button).

## fc-13. One protein has no name showing; make sure its name always shows (Protein interactions, at rest)

**Clicked:** the magnifier beside "Graphs" in the left panel. Confidence 3.

"First I have to find the protein, and the only search box I see is that magnifier. Then I would
expect a right-click on the node with a label option. I did notice '7 more hidden where they
overlap' at the bottom of the legend, but that reads like an apology, not a control."

**Scored:** wrong (the magnifier is not among the targets; the table strip, the node itself or the
legend's hidden-names line were).

## fc-14. Run the calculation again with one setting changed, and keep this one to compare (Betweenness run open)

**Clicked:** "Re-run". Confidence 3.

"Changing a setting means running it again, so Re-run. My worry is that it overwrites this
column the way Gephi does, and then there is nothing to compare. 'Compare with...' is right next
to it, but there is nothing to compare with yet."

**Scored:** correct.

## Tally

- Correct: fc-1, fc-2, fc-3, fc-5, fc-6, fc-9, fc-10, fc-11, fc-14 (9 of 14).
- fc-4: correct under the Ctrl+Z restore design, wrong under the notice-only design.
- Wrong: fc-7 and fc-8 (both 'Change...' on the Loaded line, because the screen says the amount
  is not used), fc-12 (the filter button), fc-13 (the magnifier beside Graphs).

## In her words, afterwards

"Twice you told me the amount was not being used and then expected me to ignore it. If a
weighted question needs a weight, the tool should say so where I ask the question, not make me
fix the data first and hope. And the filter: I will always reach for the filter to compare a
group with the rest, because that is how I check what a statistic ran on."
