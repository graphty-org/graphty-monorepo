# First-click test: Expert Emma (network scientist, power user)

Each answer is the one thing Emma would click first, looking only at the named screen, with her
confidence from 1 (a guess) to 7 (certain). Her remarks are in her own voice. Correctness was marked
afterwards against the target list; no answer was changed.

## Les Miserables, nothing selected (round-5-fc-lesmis-rest.png)

### fc-1: a picture of the network for the paper
- Click: the three-line menu button at the top left of the rail.
- Confidence: 5
- Remarks: "Export lives in a File menu. There is nothing on this screen that says export, so it
  is the hamburger. I would rather have an SVG button on the canvas, but fine."
- Correct: yes

### fc-2: see how the earlier bridges calculation was set up
- Click: the Bridges row under Results in the right panel.
- Confidence: 6
- Remarks: "It says Bridges, done. I expect clicking it shows the parameters it actually ran with.
  If it only shows the output I will be annoyed."
- Correct: yes

### fc-3: rank the characters a second way
- Click: the + next to Results in the right panel.
- Confidence: 5
- Remarks: "Results has a plus. That is where a new measure goes. I would try PageRank against
  degree. I would also have looked for a lightning-bolt command palette but I do not know what that
  bolt does."
- Correct: yes

### fc-4: groups 2 and 3 are hard to tell apart; change one color
- Click: the orange swatch next to 2 in the legend on the canvas.
- Confidence: 5
- Remarks: "Group 3 is not even in the legend, it is under 6 more. Group 2 is, so I change 2. The
  swatch should open a picker; if it does not, I go to Group color in the Style stack."
- Correct: yes

### fc-5: a stray click cleared a selection; get it back
- Click: none on screen; I press Ctrl-Z (undo).
- Confidence: 3
- Remarks: "I do not see an undo button or a selection history. Ctrl-Z is what every tool does.
  If that does not bring the selection back I rebuild it; I would not think to look in a menu for
  a previous selection."
- Correct: no (undo is logged separately; the target was the main menu, Edit > Previous selection)

## Les Miserables, Valjean selected (round-5-fc-lesmis-node.png)

### fc-6: find out what is painting Valjean this color
- Click: the Group color row under Appearance in the right panel.
- Confidence: 6
- Remarks: "Group color, color. That is the only row that says color. Bridges is off. Obvious
  enough, and I like that it lists the layers per node."
- Correct: yes

### fc-7: where Valjean's betweenness number comes from and how it was calculated
- Click: the betweenness row under Results in the right panel (0.57, highest).
- Confidence: 5
- Remarks: "0.57 means normalized, but normalized how? Weighted or not? Endpoints or not? I click
  the row and expect the algorithm, the normalization and the parameters. The column header in the
  table was my second choice."
- Correct: yes

## Transfers, nothing selected (round-5-fc-transfers-rest.png)

### fc-8: bring in next month's transfers file so everything carries over
- Click: Data on the left rail.
- Confidence: 4
- Remarks: "Data is where files would be. The file chip under the name was tempting, but it looks
  like a label, not a button. I want a replace-data action that keeps the styles and runs."
- Correct: yes

### fc-9: accounts that take in far more money than they send out
- Click: the Change... link in the Loaded line in the right panel ("amount not used yet").
- Confidence: 5
- Remarks: "It says amount is not used. Any in-versus-out calculation on money needs the amount as
  the weight, otherwise it is just in-degree versus out-degree, which is the wrong number. So I fix
  the weight first. Then weighted in-strength minus out-strength."
- Correct: no (Change... sets the default for new runs; target was the + on Results, Quick actions
  or the main menu)

### fc-10: cheapest route between two accounts, bigger transfer costs more
- Click: the second button on the floating toolbar (the route-like icon).
- Confidence: 3
- Remarks: "That icon looks like a path, maybe. I am guessing. And again amount is not used, so I
  will need to find where the path tool takes a weight. If it does not ask, I do not trust the
  route."
- Correct: yes

### fc-11: IT asks whether anything from this project left the computer
- Click: the line under the project name, "Nothing has been sent from this project".
- Confidence: 7
- Remarks: "That is the first thing I read on any tool. It is right there, with a lock. I click it
  to see what it counts as sent. Assistant Off, nothing is sent, is also good."
- Correct: yes

## Protein interactions, nothing selected (round-5-fc-ppi-rest.png)

### fc-12: Ribosome and Spliceosome are two blues you cannot tell apart; change one
- Click: the Spliceosome swatch in the Module color legend.
- Confidence: 6
- Remarks: "Legend swatch. Spliceosome is the darker one; I change that to something not blue."
- Correct: yes

### fc-13: bring in the lab's file of standard colors and sizes
- Click: the + next to Style stack in the right panel.
- Confidence: 3
- Remarks: "Colors and sizes are styles, so the style stack's plus, expecting an import-from-file
  option in there. Nothing on the screen says import styles."
- Correct: no (target was the main menu, Recipes, or Data on the rail)

### fc-14: how is the Ribosome module different from the rest of the network
- Click: the Ribosome label in the Module color legend.
- Confidence: 3
- Remarks: "I want density, degree distribution and internal versus external edges for that
  module against everything else. I click Ribosome hoping it selects the module and the Statistics
  follow the selection. Change overview... was the other candidate, but I do not know what an
  overview is here."
- Correct: yes

## Tally

11 of 14 correct. Misses: restoring a lost selection (went to Ctrl-Z), the in-versus-out money
question (went to fixing the weight first via Change...), and importing a lab style file (went to
the Style stack +).
