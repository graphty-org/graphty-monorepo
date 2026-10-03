# Session: first picture from the Les Miserables sample -- Priya, threat hunter (cybersecurity analyst persona)

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t01--cybersecurity-analyst/.
Every command was run from design/ui/prototype. `P` below stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t01--cybersecurity-analyst`.

## Start screen (shots/tasks/r8-t01/01.png)

"OK, before anything: is this approved, where does it run, does it phone home? Top right says
'Local only'. Left column says 'Files are read on this computer and never uploaded.' Good, that's
answered before I asked. I can't verify it from here, but at least it says it. In real life I'd
still need it on the approved list, but it's a study, so I keep going.

Then there's a banner asking to collect usage data. No. 'No thanks.' I don't share telemetry from a
bank laptop. Nice that it says nothing is collected until I answer.

Samples on the right. Les Miserables, 77 characters. It says it 'opens with worked examples:
measures, groups, paths and notes already added.' Hm. I wanted a clean one, but fine."

## Step 1 -- open the network

    timeout 120 node app-b/study.mjs --try P/01.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"It opened instantly. 77 dots, lines, a few names. The legend top left says 'Color: PageRank
0.00330 to 0.0754'. The left list has PageRank, Louvain 6 groups, Shortest paths, Density, Link
prediction, Watchlist, Group 2, Group 8, a hidden Betweenness... That's a lot already done for me.
Did I do any of that? No. So the 'work something out' part is already finished by someone else,
which doesn't count. I want to run one myself.

Network on screen: done."

## Step 2 -- run a measure myself

    timeout 120 node app-b/study.mjs --try P/02.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"

"Flask icon in the bottom toolbar. Tooltip: 'Analyze Shift+A'. That's it."

    timeout 120 node app-b/study.mjs --try P/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A picker with a search box, 'Search, or say what to find'. Recent: Louvain, PageRank, Shortest
path. Then 'Rank nodes and edges': PageRank, Degree, Total value, Betweenness, Closeness,
Eigenvector. I want choke points, so betweenness. Same word I use at work."

    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"

"(The tool said 'Betweenness' matched two things -- the row in the left list and the one in the
picker -- and the click failed. I meant the one in the picker.)"

    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"Settings: weight 'value (loaded weight)', 'Higher means: Stronger / Farther / Capacity'. And it
tells me 'Betweenness reads a weight as distance: it uses 1/value.' OK, that's actually the
detail I'd want to know, it's not hiding the inversion. All 254 edges have a value, none left out.
Good -- counts that add up. Bottom says 'Under a second'. Run."

    timeout 120 node app-b/study.mjs --try P/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"New row at the top of the list, 'Betweenness 2', with a spinner and a progress bar. Picture
hasn't changed."

    timeout 120 node app-b/study.mjs --try P/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"
    timeout 120 node app-b/study.mjs --try P/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --hover "Analyze" --hover "Analyze" --hover "Analyze" --click "Betweenness 2"

"Still spinning. It said under a second. On 77 nodes. I clicked the row and the right panel didn't
even switch to it, it still shows the graph summary. This is exactly the thing I hate: 'it's been
spinning and I can't tell if it's doing anything.' On my real file I'd be gone now."

    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --hover "More"

"Looked for a cancel or a status on the row's three dots. The pointer ended on the right panel's
'More actions' instead. Nothing tells me why it's stuck."

    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Last run"

"Tried Louvain from Recent to see if clustering was any different. It offers 'Run as copy' or
'Update Louvain row'. That's a sensible distinction. But I don't trust Run right now, so I didn't
press it."

## Step 3 -- make the colors show the result

"Workaround, said with irritation: there's already a Betweenness row in the list, hidden. I'll use
that one instead of mine."

    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness"

"Right panel: 'Covered by PageRank for Color' and a 'Move above' button. 'Paints 77 nodes, none
visible.' OK, so PageRank is winning. That message is clear. Move above."

    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness" --click "Move above"

"Toast: 'Moved Betweenness above PageRank, Undo.' Panel says 'Covers PageRank for Color'. But the
row is still at the bottom of the list, the eye is still crossed out, the legend still says
'Color: PageRank', and the dots are the same orange-brown. The panel says one thing, the picture
says another. Which is it?"

    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness" --click "Move above" --hover "Show"
    timeout 120 node app-b/study.mjs --try P/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness" --click "Move above" --click "Show Betweenness"

"Crossed eye is 'Show Betweenness'. Clicked it. Eye is open now. Legend: still 'Color: PageRank'.
Colors: same. Nothing on the drawing changed."

    timeout 120 node app-b/study.mjs --try P/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness" --click "Move above" --click "Show Betweenness" --click "Hide PageRank"

"Then I'll just switch PageRank off. Nothing is called 'Hide PageRank' -- the eye only appears
when you're on the row."

    timeout 120 node app-b/study.mjs --try P/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Betweenness" --click "Move above" --click "Show Betweenness" --click "PageRank" --click "Hide PageRank"

"Clicking 'PageRank' hit the blue PageRank link in the right panel, not the row. Then the eye
went off on PageRank. And now my 'Betweenness 2' run is gone from the list entirely, and
Betweenness shows no eye state. The legend: still 'Color: PageRank'. The dots: still orange-brown.
I hid PageRank and the drawing is still colored by PageRank.

I give up on betweenness. Honestly: the drawing IS colored by a measure of who matters --
PageRank, with a legend and a range. Valjean is the darkest dot. That checks out against what I
know of the book. I didn't compute it, the sample did, but the drawing shows a result in its
colors with a legend. I'll call 'colors show a result' done, with an asterisk. 'Have the program
work something out' -- not done by me. My run never finished."

## Step 4 -- names on the drawing

    timeout 120 node app-b/study.mjs --try P/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels shown anyway (this file)"

"Row 'Labels shown anyway, 1 node'. Clicked it: toast 'Labels shown anyway (this file): Valjean.
Opens in the inspector (not available yet).' Not available. OK."

    timeout 120 node app-b/study.mjs --try P/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Label"
    timeout 120 node app-b/study.mjs --try P/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add label"
    timeout 120 node app-b/study.mjs --try P/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add Label"
    timeout 120 node app-b/study.mjs --try P/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add"
    timeout 120 node app-b/study.mjs --try P/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Label +"

"Right panel on PageRank has Fill, Shape, Effects, Label, Tooltip with plus signs. Clicking the
word 'Label' does nothing. The plus is 'Add to Label'."

    timeout 120 node app-b/study.mjs --try P/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label"
    timeout 120 node app-b/study.mjs --try P/21.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels"
    timeout 120 node app-b/study.mjs --try P/22.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels"

"Menu: 'Label line', 'Show labels'. Picked Show labels. That adds a 'Show labels' checkbox,
unticked. Why add it unticked? Ticked it. The drawing: the same dozen names as before -- Valjean,
Javert, Marius, Fantine, Cosette... no new ones. Is this on? Is it labeling only big nodes? It
doesn't say. Also -- I'm putting labels on the PageRank row? That's a weird place for 'names on
the drawing'. I'd expect that on the graph, not on a measure."

## Step 5 -- picture file

    timeout 120 node app-b/study.mjs --try P/23.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels" --hover "Menu"
    timeout 120 node app-b/study.mjs --try P/24.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Main menu"

"Hamburger is 'Main menu'. Export..., Ctrl+E. Standard."

    timeout 120 node app-b/study.mjs --try P/25.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Main menu" --click "Export..."

"Export dialog: Image .png, 'Full graph, with the legend'. Preview has the legend in the corner,
good -- no colors without a legend in my case file. And: '64 labels hidden to avoid overlap: show
list'. So THAT's why my checkbox did nothing visible. 13 of 77 names. It should have told me on
the drawing, not here. Footer: 'Saved to this computer only; nothing is uploaded.' Good. There's
also a 'Data' option on the left -- I'd check later whether that gets me a CSV of the nodes."

    timeout 120 node app-b/study.mjs --try P/26.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Main menu" --click "Export..." --click "show list"

"Hidden list: Thenardier degree 16, Joly 12, Mabeuf 11... Thenardier hidden with degree 16 while
smaller ones are labeled. Whatever. At least it lists them, I could paste that list next to the
picture."

    timeout 120 node app-b/study.mjs --try P/27.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add to Label" --click "Show labels" --click "Show labels" --click "Main menu" --click "Export..." --click "Export"

"'Exported les-miserables.png to Downloads.' Picture file: done. Side note: the right panel's
Label section is back to just a plus -- my 'Show labels' checkbox is gone. Did it keep it or not?"

## Wrap-up

- Network on screen: done, fast.
- Program works something out: NOT done by me. My betweenness run spun forever despite 'Under a
  second', then vanished from the list. Everything computed came pre-baked in the sample.
- Colors show the result: only the pre-existing PageRank. Trying to switch the colors to
  betweenness: the panel claimed it was on top, the toast said moved, the drawing and legend never
  changed. Hiding PageRank didn't change the drawing either.
- Names on drawing: partial. Only about 13 of 77 labeled, and I only found out why in the export
  dialog.
- Picture file: done, with a legend, saved locally.

**Did I succeed?** Partly. I have a PNG with a legend and some names. But the result in it is one
the sample came with, not one I made. If this were my data, I'd have nothing.

**Single Ease Question: 3 / 7.** The beginning and end were easy. The middle -- the only part that
is actually the point -- fought me.

**Would I use this instead of my current tool?** No, not today. What I liked was concrete: it
said up front it runs locally and doesn't upload, the export repeats it, the export keeps the
legend, and the analysis dialog told me betweenness inverts the weight and that all 254 edges were
counted. That's more honesty than most tools give me. But a run that says 'under a second' and
spins forever, and a panel that says one coloring is on top while the picture shows another, are
the two things that end a trial for me. If I can't trust that the picture matches what the panel
says, I can't put it in a case.
