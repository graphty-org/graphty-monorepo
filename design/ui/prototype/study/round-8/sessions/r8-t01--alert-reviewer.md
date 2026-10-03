# Session: first sitting with the Les Miserables sample -- Nadia, level-1 alert reviewer

Task as read by the moderator: get the ready-made Les Miserables network on screen, have the
program work out something about the characters, make the drawing show that result in its
colors or sizes, get the characters' names written on the drawing, and finish with a picture
file to paste into a document. Say out loud when each part is done.

Start screen: shots/tasks/r8-t01/01.png. All renders below are in
tmp/round-8-sessions/r8-t01--alert-reviewer/. Every command was run from
design/ui/prototype with `D=$PWD/tmp/round-8-sessions/r8-t01--alert-reviewer`.

## Steps, think-aloud and commands

**01 (start screen).** "Big privacy box at the bottom. Fine, no thanks, I don't share anything
from a bank laptop. Samples on the right -- Les Miserables, 77 characters. That's the one."

**02.** `node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"`
"OK, it's up. Dots and lines, some names. Part one done -- the network is on screen.
...But hang on, it's already orange-to-brown, the box on the top says 'Color: PageRank', and the
list on the left already has PageRank, Louvain six groups, shortest paths, a watchlist, 'For the
report'. Somebody already did my homework. Did I just open somebody's project? The task says
I have the program work something out, so I'll do it myself rather than take credit for this."

**03.** `... --hover "Analyze"` (the flask at the bottom) -> tooltip "Analyze Shift+A".
"Flask means analyze. OK."

**04.** `... --click "Analyze"`
"A list. 'Recent': Louvain, PageRank, so those were run before me. Then 'Rank nodes and edges':
PageRank 'Start here', Degree, Betweenness... Degree I understand -- how many connections. In
my world that's how many counterparties. I'll take Degree, it's the one I could explain to QA."

**05.** `... --click "Degree"`
"It ran. Right side: a bar chart, and a Top 10 -- Valjean 36, Gavroche 22, Marius 19. That's
who matters most, by number of connections. Part two done, I think.
But the picture didn't move. Still orange, legend still says PageRank. And I don't see a
Degree line in the list on the left. Something new did appear there, 'Group 6, not listed,
1 node', grayed out. I didn't make a Group 6. Did I change something?"

**06.** `... --click "Style"`
"Style tab for Degree says 'Paints 77 nodes' and 'Size 0.5 to 3'. So the dots should be
different sizes now. They're not. Every dot looks the same size to me. Either it's too subtle
or it isn't painting."

**07.** `... --click "Fill"` -> nothing changed.
"Clicked the word Fill. Nothing."

**08.** Tried to name the plus beside Fill: `--hover "Add fill"` -> "nothing on screen is called
Add fill"; `--hover "Add"` -> tooltip "Add to Fill"; `--hover "+"` -> nothing; `--hover "Color"`
-> no tooltip (render 08 was overwritten by that last attempt; the "Add to Fill" tooltip was
re-rendered as 08).

**09.** `... --click "Style" --click "Add to Fill"`
"Now there's 'Color 808080' with a gray swatch. Gray? I wanted it colored by degree, not gray.
And the drawing is still orange. Nothing I do over here touches the picture."

**10.** Tried to find out what the little cylinder icon beside the color does:
`--hover "Data"`, `"Use a value"`, `"From data"`, `"Bind"`, `"column"`, `"value"` -- none gave
its name ("column" landed on 'Columns: 9 of 9' at the bottom instead).
"I can't tell what that drum icon is. I'm not clicking things I can't name."

**11.** Changed approach -- the communities one, "who belongs together":
`... --click "Analyze" --click "Louvain"` (the tool reported four things called Louvain and
timed out on the first) then `... --click "Analyze" --click "Last run: Resolution 1.0"`.
"Louvain panel. 'Weight: value (loaded weight)', 'Higher means: Stronger / Farther / Capacity',
'Resolution 1.0'. I don't know what any of that means and I'm not going to touch it. Two
buttons: 'Run as copy' and 'Update Louvain row'. Row? I'll take the blue one."

**12.** `... --click "Update Louvain row"`
"'Updated just now: 6 communities, the same as before.' Six groups, Community 1 with 25,
hub Gavroche, Community 2 hub Valjean, Myriel, Fantine, Thenardier, Gillenormand. That's
actually a nice list -- I could paste that. But the picture is STILL all orange. The colored
dots next to the communities -- yellow, light blue, green -- none of those colors are on the
drawing."

**13.** `... --hover "Hide"` -> tooltip "Hide Louvain. Alt-click or Alt+Space: show only this
row." "Show only this row -- that's what I want. Show me just the groups."

**14.** `... --click "Update Louvain row" --key "Alt+Space"`
"What? The analyze list popped back up and my Louvain is folded away again. I don't know what I
just did. Did I undo the run?"

**15.** `... --click "Hide PageRank"` -> "nothing on screen is called Hide PageRank" (the eye
only shows when you're on the row). Then
`... --click "Update Louvain row" --click "PageRank" --click "Hide PageRank"`
"The PageRank row's eye is crossed out now, and it says PageRank 'Covers Louvain for Color' --
so PageRank was sitting on top of my groups. But I hid it and the drawing is the same orange
and the box on top still says 'Color: PageRank'. I'm done fighting the colors.
The drawing does show a result in its colors -- PageRank, darker is more important, Valjean is
the dark one in the middle. It came with the sample, I didn't do it, but it's a result in the
colors. I'll call part three done, with an asterisk. In a QA file I'd have to write 'the colors
are PageRank, which I did not run', and that's not a sentence I'd want to write."

**16.** `... --click "Labels"`
"Names. There's a row 'Labels shown anyway... 1 node'. Clicked it: 'Labels shown anyway (this
file): Valjean. Opens in the inspector (not available yet).' Not available. OK."

**17.** `... --click "Add to Label"` -> menu: "Label line", "Show labels".

**18-19.** `... --click "Show labels" --click "Show labels"`
"There's a Show labels checkbox now, I ticked it. Same names as before -- Fantine, Myriel,
Cosette, Valjean, Javert, Marius, Gavroche, a few in the cluster at the bottom. Most dots have
no name. I count about thirteen. Is that all of them? It isn't."

**20-21.** `... --hover "Menu"` -> "Main menu"; then
`... --click "Show labels" --click "Main menu"`
"Save, Export... Export. Ctrl+E, good to know."

**22.** `... --click "Export..."`
"Image .png, full graph with the legend. Preview looks like the screen. And here's the answer
to the names: '64 labels hidden to avoid overlap: show list.' So it decided for me. 77 minus 64
is 13 -- matches what I counted. Fine, for a picture you paste into a file that's probably
right, nobody can read 77 names stacked on each other. Part four done, as far as the program
will let it be done.
There's a Copy button. That's the one I'd actually use -- Ctrl+V straight into the alert file.
But the task says a file, so Export."

**23.** `... --click "Export"`
"'Exported les-miserables.png to Downloads.' Part five done.
...Wait. Back on the panel, the Label section is empty again -- my 'Show labels' tick is gone.
Did it keep it or not? Did my picture have it?"

Total: about 23 attempts, maybe 15-20 minutes in real life.

## Did I succeed?

Partly. I have a PNG with the network, a color result and some names. But the color result is
the PageRank that came with the sample, not anything I ran. Both things I ran myself -- Degree
and the six Louvain groups -- gave me good lists on the right and never showed up on the
drawing. If my team lead asked "show me the groups on the picture", I couldn't.

## Single Ease Question

**3 out of 7.** Opening the sample and exporting were easy. The middle -- getting what I worked
out onto the drawing -- I never managed, and nothing told me why.

## Would I use this instead of my current tool?

No, not today. I don't use a graph tool now; my picture is a screenshot of the case system.
For a picture to go into an alert file I'd need to say what the colors mean and that I made
them. Here the drawing kept showing something somebody else had set up, while my own results
sat in a side panel. If I can't tell whether my click changed the picture, the data, or
nothing, QA will ask, and I won't have an answer. The Copy-image button and the "nothing is
uploaded" line are the two things I'd point at if someone above me were deciding.
