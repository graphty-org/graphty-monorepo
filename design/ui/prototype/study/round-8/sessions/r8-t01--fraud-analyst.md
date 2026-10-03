# Session: first sitting with the Les Miserables sample -- Sarah, fraud analyst

Task as given by the moderator: get the ready-made Les Miserables network on screen, have the
program work out something about the characters, make the drawing show that result in its
colors or sizes, get the characters' names written on the drawing, and finish with a picture
file to paste into a document. Say aloud when each part is done.

Mode: first impression, not mandated. Practice data, so the "does it upload" worry is lower
than usual, but she still checks.

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t01--fraud-analyst/. Every command
was run from design/ui/prototype with `D` set to that folder.

## Step by step

### 01 -- start screen (shots/tasks/r8-t01/01.png)

"OK. Open, New from data, a list of samples on the right. Les Miserables, 77 characters, there
it is. 'Files are read on this computer and never uploaded' -- good, that's the first thing I
look for. And a box at the bottom asking to collect usage data. No. 'No thanks'."

### 02 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"That was quick. A network, some names on it -- Valjean, Javert, Marius, Fantine. Part one is
done: it's on screen.

But hang on. The left side is already full: PageRank, Louvain six groups, Shortest paths,
Density, Watchlist, a folder 'For the report'... and a box up top says 'Color: PageRank'.
So somebody already did the analysis? I was told to have the program work something out. Did
I just do the whole task by opening the file? I don't trust a picture I didn't build. If my
reviewer asks what I ran, I can't say 'it came like that'."

### 03-04 -- looking for where you run something

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"The panel on the right says PageRank came 'from Analyze'. The little flask at the bottom --
rest the pointer -- 'Analyze'. Fine, that's where it lives. I would not have guessed a flask.

The list: Louvain, PageRank with a 'Start here' tag, Degree, Total value, Betweenness,
Closeness, Eigenvector. PageRank, eigenvector -- that's vendor talk. But Degree says 'how many
edges each node has'. That I understand: who's linked to the most people. That's my hub, the
account everything touches. I'll take Degree. At least each one has a line saying what it
does; that helps."

### 05 -- run Degree

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree"

"Now this I like. A Top 10 with numbers: Valjean 36, Gavroche 22, Marius 19, Javert 17,
Thenardier 16. 'Show all in table'. That's a list I could put in the file and someone could
count the links to check it. Part two, done -- it worked out who matters most.

But look at the picture. Still says 'Color: PageRank'. Nothing on the drawing changed. And
Degree didn't show up in the list on the left with the others. So did it apply anything or did
it just show me a table?"

### 06-08 -- trying to make the picture show Degree

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style"
    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "Fill"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "0.5 to 3"

"Style tab. 'Paints 77 nodes.' Size, 0.5 to 3. So it says it's sizing them by Degree. Then
why are all the dots the same size? Valjean should be the biggest dot on there by a mile. He's
darker, I think, but that's the PageRank color, not size.

Clicked Fill. Nothing happened. Clicked the size box. Now the right side has jumped back to
PageRank and a pop-up 'Color by PageRank' is open. I didn't ask for PageRank. I'm lost --
which one am I editing?"

### 09 -- try to switch the color to Degree

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "0.5 to 3" --click "Source"

"There's a 'Source: PageRank' drop-down. If I could pick Degree there, fine. Clicked it.
Nothing. Not opening.

OK. I'll stop fighting it. The picture is colored by PageRank, which the list said means
'connected to other well-connected' people -- close enough to who matters. Part three: the
drawing shows a result in its colors. Done, I suppose, but it's the result that was already
there, not the one I ran. If this were a case I'd be writing in my notes 'color is PageRank,
pre-loaded, not chosen by me' and my reviewer would ask why."

### 10-14 -- names on the drawing

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "0.5 to 3" --key Escape --click "Labels"
    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "0.5 to 3" --key Escape --click "Label"
    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Add label"
    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything"
    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"

"About a dozen names are on there. Most dots have none. I want all the names.

'Labels show... 1 node' on the left. Clicked it: a message, 'Labels shown anyway (this file):
Valjean. Opens in the inspector (not available yet).' Not available yet. Great.

Right side has 'Label' with a plus. Clicked Label -- nothing. Tried 'Add label' -- nothing on
screen is called that. Clicked 'Everything' at the bottom of the list, that one has Label with
a plus too. Clicked it. Nothing.

So I can't turn the names on. There are some on there already. That's as far as I get. Part
four: partly. Some names, not by me, and I can't tell why those and not the others."

### 15-17 -- looking for the picture export

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu"
    timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

"Three lines top left, that's a menu. Export, Ctrl+E. Good, normal place.

Export window: Image .png, 'Full graph, with the legend'. Legend is in the picture -- good,
because a color with no key is useless in a case file. 'Saved to this computer only; nothing
is uploaded.' Right at the bottom. That's the sentence I need for IT.

And: '64 labels hidden to avoid overlap'. So that's why the names are missing. 64 of 77."

### 18 -- which names are hidden

    timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "show list"

"Thenardier, degree 16. That's number five on the list I just ran. The fifth most connected
character has no name on the picture. Joly, Mabeuf. If this were a mule ring and the fifth
biggest hub went into the SAR exhibit with no label, that's an examiner question. It tells me
which are hidden, I'll give it that -- it's honest -- but there's no 'show them anyway'."

### 19 -- print look

    timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Print"

"Print: shows it next to itself in gray, as it'd come out of the printer, and the legend gets
the actual values at each gray step. That's actually good. Half our case files get printed
black and white and nobody can read the colored ones. Cool -- and I don't say that much. Still
64 labels hidden."

### 20 -- export

    timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Print" --click "Export"

"'Exported les-miserables.png to Downloads.' Part five, done. I have a file I can paste."

### 21 -- one last look for labels

    timeout 120 node app-b/study.mjs --try $D/21.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Style"

"Back on the right panel. Label, plus. Same as before. I'm done."

## Her verdict

Did she succeed? "Partly. It's on screen, I got a ranked list of who has the most links, and I
have a PNG with a legend that prints in gray. But the coloring on that picture is PageRank,
which was already there when I opened it -- the thing I ran, Degree, never showed on the
drawing even though the panel said it was sizing by it. And most of the names aren't on it,
including the fifth biggest hub, and I couldn't switch them on. So three out of five I'd sign
for; two I'd have to explain."

Parts she called done: on screen (yes), worked something out (yes, Degree top 10), drawing
shows a result (only the pre-loaded PageRank coloring), names on drawing (partial, 13 of 77,
not her doing), picture file (yes).

Single Ease Question: 3 of 7. "Opening it and exporting were easy. The middle was not. I
clicked four things that did nothing."

Would she use it instead of her current tool? "Not instead. For most of my cases I don't need
a picture, I need a pivot table. For the big ones we have the link-chart tool already. What I
liked: the ranked list with real counts, 'nothing is uploaded' said plainly, and the gray print
check. What kills it: I can't tell what I ran versus what was already done, the result I ran
didn't change the picture, and I can't put names on the accounts. A chart of a ring where the
hubs have no names isn't an exhibit. Fix those and I'd ask my manager to look at it for the
big cases."

## Problems seen

1. The sample opens with analyses and colors already applied (PageRank color, Louvain groups,
   paths, watchlists, a report folder). A first-time user cannot tell what she did from what
   came with the file, and the task "have the program work something out" is already
   half-done before she starts. Severity: high for a skeptical user who must account for
   every step.
2. Running Degree from Analyze produced a ranked list and a Style tab claiming "Paints 77
   nodes" and "Size 0.5 to 3", but the drawing did not visibly change (all dots same size,
   color still PageRank), and Degree did not appear in the left list. Severity: high -- the
   core "make the picture show my result" step failed.
3. Clicking the Degree size box switched the inspector to PageRank and opened "Color by
   PageRank" -- she lost track of which result she was editing. Severity: medium.
4. The "Source" drop-down in "Color by PageRank" did not open. Severity: medium (it was her
   only remaining route to color by Degree).
5. No working way to turn names on: the Labels row says "not available yet", and the Label
   plus on the right panel did nothing on both PageRank and Everything. Severity: high -- a
   whole task part blocked.
6. The export hides 64 of 77 labels to avoid overlap, including Thenardier (degree 16, fifth
   by her own Degree ranking), with no option to show them anyway. Severity: medium-high for
   evidence use; the list of hidden labels is a good honest touch.
7. The Analyze tool is behind an unlabeled flask icon; she only found it because the right
   panel said "from Analyze". Severity: low-medium.

## What worked for her

- "Files are read on this computer and never uploaded" on the start screen and "Saved to this
  computer only; nothing is uploaded" in the export.
- Degree's Top 10 with plain counts and "Show all in table".
- Analyze list items each carry a one-line plain description.
- Export includes the legend; the Print look previews the grayscale version and prints the
  value at each gray step.
- Export said where the file went ("to Downloads").
