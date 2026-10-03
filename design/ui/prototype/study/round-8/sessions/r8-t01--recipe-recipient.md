# Session r8-t01 -- recipe recipient (Tom, lab manager)

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t01--recipe-recipient/` (D below). Every run replays from the start
screen; each command below lists the full click path.

## 01 -- start screen (shots/tasks/r8-t01/01.png)

Think-aloud: "OK, no login, no install. Good. There's a box at the bottom asking about usage data.
I read the first line -- 'Your data is yours' -- fine, No thanks. On the left it says 'Files are
read on this computer and never uploaded.' I like that, though it's not my data today anyway. On
the right, Samples, and there's Les Miserables, 77 characters. That's the one she meant."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"There's the picture. Dots, lines, some names: Valjean, Javert, Cosette, Marius. Part one done --
the network is on screen."

"But it's already all orange, and there's a box at the top saying 'Color: PageRank'. And on the
left a long list: PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, For the
report... That's more than I'd read. So someone already did the work? The task says I'm supposed to
have the program work something out. I don't know if this counts. I don't know what PageRank or
Louvain are."

## 03 -- looking for where to 'work something out'

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"

"On the right it says 'Measure from Analyze'. There's a row of icons at the bottom; I rest on the
flask one. Tooltip: 'Analyze'. That's my button."

## 04 -- Analyze opened

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"A list. 'Search, or say what to find.' Under 'Rank nodes and edges' there's PageRank with a little
'Start here' tag, and the line under it says which nodes are connected to other well-connected
nodes. That's roughly 'who matters'. Degree is 'how many edges each node has' -- I'd understand
that one better, honestly. But it says start here, so I'll start there."

## 05 -- PageRank settings

(The tool noted that "Start here" matched four entries -- PageRank, Leiden, Shortest path and Link
prediction -- and clicked the first, PageRank, which is the one I meant.)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here"

"Now it's asking me things. Weight: 'value (loaded weight)'. 'Higher means: Stronger, Farther,
Capacity.' Damping 0.85. I don't know any of that and I'm not learning it now. I leave it alone.
Two buttons at the bottom: 'Run as copy' and a blue 'Update PageRank row'. What's a row? Update
sounds like it changes something that's already there. It's a sample, so I'll risk it -- I wouldn't
with the postdoc's file. Blue button."

## 06 -- after running

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row"

"The picture didn't change at all. Did it do anything? ... On the right there's now a 'Top 10':
Valjean 0.0754, Myriel, Gavroche, Marius, Javert. OK, that's a list I can read -- Valjean matters
most, that makes sense from the book. But down at the bottom it says 'Ran Sep 28'. Today isn't Sep
28. So did it run just now, or is this the old one? I'll call part two done, but I'm not sure I did
it rather than whoever set up the sample."

## 07 -- is it showing in the colors?

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Style"

"Style tab. 'Paints 77 nodes.' Color: Orange to brown. And the box over the picture says Color:
PageRank. So yes, the colors are the result. Valjean's dot is darker. Honestly they all look about
the same orange to me -- only two or three are visibly darker. If I put this in front of the PI he
couldn't tell who matters. Bigger dots would be better. There's 'Shape' with a plus."

## 08 -- try to make important ones bigger

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Style" --click "Shape"

"Clicked Shape. Nothing. Nothing opened, nothing moved. Fine -- maybe that's not it. The colors
are technically there, so I'll say part three is done, barely."

## 09 -- names on the drawing

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Style" --click "Labels show"

"About a dozen names are already on there, but most dots don't have one. On the left there's
'Labels show... 1 node'. Clicked it. A black message: 'Labels shown anyway (this file): Valjean.
Opens in the inspector (not available yet).' I don't know what that means. One node? I can see
twelve names. And 'not available yet' -- so I can't do it?"

## 10 -- second try at names

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Style" --click "Label"

"Right side, 'Label' with a plus. Clicked it. Nothing happened again. That's twice now nothing
happens when I click. I'm not getting all the names on. Normally this is where I'd say I'll ask her
to just send me a PNG. Before I give up, I'll look in the menu for saving a picture, because that's
the bit I'd actually need."

## 11 -- the menu

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Menu"

"Three lines, top left. New project, Open, Save, Export. Export."

## 12 -- Export dialog

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Main menu" --click "Export..."

"Image .png, 'Full graph, with the legend'. Good, it keeps the legend. A small preview. And then:
'64 labels hidden to avoid overlap.' So 64 of the 77 names won't be on it. That's my names problem,
confirmed -- the program decided for me. At the bottom: 'Saved to this computer only; nothing is
uploaded.' That I like. Blue Export."

## 13 -- exported

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row" --click "Main menu" --click "Export..." --click "Export"

"'Exported les-miserables.png to Downloads.' Part five done -- I have a picture file."

## After the session

**Did I succeed?** Partly. The network was on screen, I ran the 'who matters' thing and got a top
10 I could read, the picture is colored by it, and I have a PNG with a legend. The names part I did
not do: about thirteen names were already on it, and the export itself told me 64 were hidden. I
clicked two things to add names and neither did anything. And I'm still not sure my click on
'Update PageRank row' changed anything, because the picture looked identical and the date said Sep
28.

**Single Ease Question:** 3 out of 7. Opening the sample and exporting were easy. Running the
analysis asked me questions I can't answer (weight, damping, stronger or farther), and the
'Start here' label was the only reason I picked anything. The colors barely differ, so the result
doesn't really show. Two clicks did nothing at all.

**Would I use this instead of what I use now?** Not on my own, not yet. What I use now is "she
sends me a PNG and an Excel file". This was better than Cytoscape in that it opened in the browser
and it said twice that nothing gets uploaded -- that matters to me. But the sample already had
everything done to it, so I couldn't tell what I did versus what was there, and the names and the
sizes I couldn't get. If she set it up and I only had to open it and press Export, yes. Building it
myself, I'd still ask her.
