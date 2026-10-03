# Session: Les Miserables from load to exported picture -- the student with a class project

Participant: Dev, third-year history student, first time using graph software, has followed one
Gephi tutorial video (load, layout, size by degree, color by communities, labels, export).

Task as given: "You have never used this program before. A friend said it turns a list of
connections into a picture that shows who matters and how people cluster. You have no file of
your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t01--class-project-student/. Every command below starts with
`timeout 120 node app-b/study.mjs --try <that folder>/NN.png task:r8-t01`; only the steps are
listed.

## Start screen (shots/tasks/r8-t01/01.png)

"OK, reading everything. Start: Open project or file, New from data. Recent projects, empty.
Samples on the right -- Les Miserables, 77 characters, 'good for a first look at communities and
who holds the story together. Opens with worked examples: measures, groups, paths and notes
already added.' That's literally my task. There's a big box at the bottom asking about usage data.
I don't want to share anything, so 'No thanks'. Then Les Miserables."

## 01 -- `--click "No thanks" --click "Les Miserables"`

"Whoa, that was fast. There's the network, orange dots with lines, some names on it -- Valjean in
the middle, Fantine, Myriel, Javert, Marius, Gavroche. Part one, the network is on screen: DONE.

But... it's already colored? Top left says 'Color: PageRank 0.00330 to 0.0754'. And the list on
the left has a ton of stuff: Selection, Notes, Labels shown, PageRank, Louvain 6 groups, Shortest
paths, Density, Link prediction, Top 9 by degree, Watchlist, 'For the report', Group 2, Group 8,
Betweenness, Everything. I didn't do any of this. The sample said worked examples were already
added, so I guess this is someone else's homework. I want to do it myself so I know how for my
real file. In my tutorial the step is 'Statistics'. I don't see that word. There's a little row
of icons at the bottom, the first looks like a lab beaker. And on the right it says 'Measure from
Analyze' -- maybe Analyze is the statistics thing."

## 02 -- `... --hover "flask"`

Result: nothing on screen is called "flask". "I don't know what that icon is called. Let me just
try the word I saw, Analyze."

## 03 -- `... --click "Analyze"`

"A list popped up: Analyze. Recent: Louvain, PageRank, Shortest path. 'Rank nodes and edges':
PageRank (Start here), Degree, Total value, Betweenness, Closeness, Eigenvector. I know Degree
and Betweenness from the video. The video sizes nodes by degree, so Degree."

## 04 -- `... --click "Analyze" --click "Degree"`

"Right panel says Degree, and there's a bar chart and a Top 10: Valjean 36, Gavroche 22, Marius
19, Javert 17, Thenardier 16. Nice, that's exactly what I'd write in the essay -- Valjean is the
most connected. So the program worked something out: DONE, I think.

But the picture didn't change at all. Still orange by PageRank. And I don't see Degree added to
the list on the left -- the list grew a gray 'Group 6, not listed' row instead, which I don't
understand. Is my Degree saved anywhere? In Gephi I'd go to Ranking and pick size. There's a
'Style' tab at the top of the right panel."

## 05 -- `... --click "Degree" --click "Style"`

"Style says 'Paints 77 nodes (every node with a value)'. Under Shape: Size '0.5 to 3'. So it's
supposedly sizing by degree already? But all the dots in the picture are the same size. Valjean
should be huge. Maybe I have to click the size thing to turn it on."

## 06 -- `... --click "Style" --click "0.5 to 3"`

"Huh. That opened a box called 'Color by PageRank' -- Source PageRank, palette Orange to brown,
Clamp, Suggested layers, Detach. That's not size and it's not Degree. And now the right panel
says PageRank again. My Degree is gone. That's two tries at making the size follow degree, and
both times the picture stayed the same. I give up on sizes.

Fine -- the colors already follow PageRank, and PageRank said 'which nodes are connected to other
well-connected nodes', which is basically who matters. Valjean is the darkest. But I'd rather do
the groups, the 'which belong together' part, like Modularity in the video. Louvain says 6
groups. Let me click it."

## 07 -- `... --click "Louvain"`

Tool note: "Louvain" matched a tab at the bottom and the list row; the tab was clicked.
"A table opened at the bottom: 6 communities, Community 1 is 25 people, Community 2 is 17, and so
on, each with a colored dot -- yellow, light blue, green, blue, orange, pink. That's the groups.
But the drawing is still all orange. Where are those colors?"

## 08 -- `... --click "Louvain, 1 note"`

"Clicked the Louvain row in the list. Right panel: 'Paints 77 nodes. Covered by PageRank for
Color on 77 of 77.' OK so PageRank is sitting on top of the groups. I need to switch PageRank off.
There's an eye next to the rows, like in Photoshop layers."

## 09 -- `... --click "PageRank" --click "Hide"`

"The eye next to PageRank now has a line through it, so it's hidden. But the picture is EXACTLY the
same -- still orange, and the box at the top still says 'Color: PageRank'. So hiding it did
nothing? That's my second try at getting the groups on the picture. I don't get what 'covered'
means if hiding the cover doesn't uncover anything. I'm going to stop on this. The picture shows
PageRank in color, which is a result about the characters, so I'll count the colors part as done
-- but honestly the program did it, not me. Colors: DONE, sort of."

## 10 -- `... --click "Labels"`

"Names. Some are on there already, maybe fifteen, but not all 77. There's a row 'Labels shown...
1 node'. Clicking it: a black message at the bottom says 'Labels shown anyway (this file):
Valjean. Opens in the inspector (not available yet)'. Not available yet. OK."

## 11 -- `... --click "Everything" --click "Label"`

"'Everything' sounds like the whole graph's settings. Right panel: Fill color 808080, Shape
Faceted sphere, Size 1, and then Effects, Label, Tooltip with plus signs. Clicked Label. Nothing
opened."

## 12 -- `... --click "Everything" --click "Add label"`

Result: nothing on screen is called "Add label". "I can't find the name of the plus button.
Second try on labels, giving up. The drawing has the main characters' names on it -- Valjean,
Javert, Cosette, Marius, Fantine, Gavroche, Eponine. For my teacher, the important people being
named is probably enough. Names: DONE-ish."

## 13 -- `... --click "Menu"`

Tool note: "Menu" matched "Main menu" and "Les Miserables, project menu"; the first was clicked.
"Three-line menu: New project, Open recent, Open project or file, Save, Export... Ctrl+E. There
it is."

## 14 -- `... --click "Main menu" --click "Export..."`

"Export: Image .png, 'Full graph, with the legend'. A preview of the picture. '64 labels hidden to
avoid overlap: show list.' Oh -- so the program HAS all the names, it just hides most of them so
they don't pile up. That explains why only some show. Preset 'To share -- PNG, 2x', size 1,802 x
1,638. That's fine for a Word document. Export."

## 15 -- `... --click "Main menu" --click "Export..." --click "Export"`

Tool note: "Export" matched the button, the dialog and its heading; the button was clicked.
"'Exported les-miserables.png to Downloads.' Picture file: DONE."

## Wrap-up

Did I succeed? "Partly. I have a PNG with colors and names that I could paste into a document, so
by the picture, yes. But the coloring was already there when I opened the sample. The one thing I
worked out myself -- Degree -- told me Valjean is the most connected, which is great, but I could
never get it onto the drawing: the Size said '0.5 to 3' and nothing got bigger, and clicking it
took me to PageRank colors instead. I also could not get the six groups to show in color; hiding
PageRank did not change the picture. And I could not add more names -- the labels row said 'not
available yet'. If my teacher asked 'how did you color it', I couldn't really tell her."

Single Ease Question (1 = very difficult, 7 = very easy): 4. "Loading and exporting were easy,
like a 6 or 7. The middle -- getting MY result into the picture -- was a 2."

Would I use this instead of Gephi? "Maybe. It's way less scary to start, the sample opened
instantly, the Top 10 list is exactly what I need for the essay, and Export was where I'd expect.
Gephi at least changes the picture when I hit Apply. Here I clicked things and the drawing just
sat there. If I could make the dots bigger by degree and color by groups myself, I'd switch."

## Where I got stuck (observer summary in participant terms)

- Running Degree from Analyze gave a ranked list but nothing on the drawing changed, and no
  Degree row appeared in the left list (a gray "Group 6, not listed" row appeared instead).
- Degree's Style tab claims "Paints 77 nodes" and Size "0.5 to 3", but every dot is the same size.
  Clicking the size value opened "Color by PageRank" and dropped Degree from the panel.
- Louvain says "Covered by PageRank for Color"; hiding PageRank (eye struck through) left the
  drawing orange and the legend still reading "Color: PageRank".
- The "Labels shown" row ends in "(not available yet)"; the plus next to Label had no name I
  could find. I only learned in the Export dialog that 64 labels are hidden to avoid overlap.
- The bottom toolbar's first icon (looks like a beaker) has no visible word; I reached Analyze
  only by guessing the word from "Measure from Analyze" in the side panel.
- The sample opening with everything already done made it hard to tell what I had done versus
  what came with it.
