# First-click test: Dr. Min-ji Kim, knowledge graph engineer

Each answer is the one thing she would click first on a still screen, with her confidence
from 1 (a guess) to 7 (certain), in her own words. Correctness was marked afterwards against
the intended targets; no answer was changed.

Screens: the Les Miserables project at rest, the same project with Valjean selected, the
March 2026 transfers project at rest, and the human protein interactions project at rest.

| Prompt | Screen | First click | Sure (1-7) | Correct |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | Main menu button (three lines, top left) | 4 | yes |
| Repeat the earlier bridges calculation exactly | Les Miserables, at rest | Bridges row under Results | 6 | yes |
| Rank the characters a second way | Les Miserables, at rest | + next to Results | 5 | yes |
| Groups 2 and 3 are hard to tell apart | Les Miserables, at rest | Group color row in the Style stack | 5 | yes |
| Get back a selection a stray click cleared | Les Miserables, at rest | Main menu button, looking for Edit > Undo | 2 | yes |
| What is painting Valjean this color | Les Miserables, Valjean selected | Group color row under Appearance | 6 | yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | betweenness row under Results | 5 | yes |
| Bring in next month's transfers file | Transfers, at rest | Data on the rail | 4 | yes |
| Accounts that take in far more than they send | Transfers, at rest | + next to Results | 3 | yes |
| Cheapest route, bigger transfer costs more | Transfers, at rest | Change... in the "Loaded" line | 5 | no |
| Has anything left the computer | Transfers, at rest | "Nothing has been sent from this project" | 6 | yes |
| Ribosome and Spliceosome blues | Protein interactions, at rest | Ribosome swatch in the legend | 4 | yes |
| Bring in the lab's color and size file | Protein interactions, at rest | + next to Style stack | 3 | no |
| How Ribosome differs from the rest | Protein interactions, at rest | Change overview... in Statistics | 3 | no |

Score: 11 of 14.

## Transcript

**Picture for the paper.** "There is no Export anywhere I can see. No download icon, nothing on
the canvas. Normally it lives under File, so the three lines at the top left. I want SVG, not a
screenshot. If that menu only offers PNG I will be annoyed." Main menu, 4.

**Repeat the bridges calculation.** "Results, Bridges, done. That is the obvious place. I would
expect the parameters and the version of the algorithm behind that row. If it only says 'done'
when I open it, that is not reproducible." Bridges row, 6.

**Rank a second way.** "Second way meaning a different centrality. Which ones do you have?
Results has a plus. I assume that is where new calculations come from." + on Results, 5.

**Groups 2 and 3.** "Group 3 is not even in the legend, it is in '6 more'. So I go to the thing
that owns the colors, the Group color layer in the Style stack. Also: 2 is orange and 3 is a
darker orange-red. I cannot tell those apart either; I would want shape, not a second hue." Group
color in Style stack, 5.

**Lost selection.** "My hands would press Ctrl+Z before I think. If I have to click, there is no
undo button on screen, so the main menu and hope there is an Edit menu. I do not expect undo to
bring back a selection, most tools do not treat selection as an action." Main menu, 2. (She
expected Undo, not a named previous-selection command.)

**What paints Valjean.** "Appearance lists the layers that touch him. Group color, the orange
swatch matches. I would click that and expect it to say 'group = 2 -> this color'." Group color
under Appearance, 6.

**Valjean's betweenness.** "Results, betweenness, 0.57, highest. Click that and I want to see:
normalized or not, directed or not, weighted or not. 0.57 means nothing without that." Results
row, 5.

**Next month's file.** "Data on the left rail. That is where files go in. I would expect it to
ask whether to replace the data and keep the styles. Change... next to 'Loaded' was tempting,
but that line reads like import settings, not a new file." Data rail, 4.

**Money in versus out.** "That is weighted in-degree against weighted out-degree. But the panel
says amount is not used yet, so any answer I get now is by count, not money. I would start at +
on Results and complain when it asks for a weight it does not have." + on Results, 3.

**Cheapest route with bigger = more expensive.** "It says right there: 'amount not used yet.
Change...'. The weight has to be set first or the path is by hop count. So Change... is my first
click, then I go find a path tool." Change... in the Loaded line, 5. Not a target: that sets the
default for new runs, not the path itself.

**Has anything left the computer.** "'Nothing has been sent from this project', with a lock, under
the name. That is exactly what IT asks. I would click it to see the log behind the claim."
The line under the project name, 6.

**Ribosome and Spliceosome.** "Light blue and dark blue. Those I can tell apart, actually; my
problem is red and green. But fine: click the Ribosome swatch in the legend and expect a picker."
Legend swatch, 4.

**Lab color and size file.** "Colors and sizes are style. Style stack has a plus, and adding a
layer from a file is what I would expect to find there. I would not think to look for this under
Data; Data is for the graph." + on Style stack, 3. Not a target.

**How Ribosome differs.** "I want the statistics for that module against the rest: density,
degree, how many edges leave it. The Statistics panel says 'Overview: General' with 'Change
overview...'. I assume one of the other overviews is by module. That is what SemSpect would give
me." Change overview..., 3. Not a target.

## What she said about the screens overall

- "Where is export? A picture for a paper is the most common thing anyone asks for, and it is
  hidden behind three lines."
- "The 'amount not used yet' line is the most useful sentence on the transfers screen. It told me
  my path would be wrong before I ran it. More of that."
- "The privacy line is good. I would still want to click it and see the evidence."
- "A legend that hides group 3 under '6 more' is not a legend for the question you asked me."
- "Results rows are the right idea. They are only worth something if they open to the exact
  parameters."
