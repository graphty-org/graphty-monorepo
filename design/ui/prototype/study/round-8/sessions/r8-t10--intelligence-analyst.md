# Session: label every character (Les Miserables sample) -- Marcus, criminal intelligence analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t10--intelligence-analyst/. D below stands for that folder's full path.

## 01 -- start screen (shots/tasks/r8-t10/01.png)

Start page. "Local only", "Files are read on this computer and never uploaded." Good, that is the
first thing I look for. There is a box at the bottom asking to share usage data. No. Not on a
work machine, not ever. Les Miserables is in the samples on the right, "77 characters".

## 02 -- decline usage data, open the sample

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t10 --click "No thanks" --click "Les Miserables"

The chart is up. Orange dots, maybe fifteen of them have names (Valjean, Javert, Cosette, Marius,
Fantine...). Lots of stuff in the left list I did not ask for: PageRank, Louvain, Shortest paths,
Watchlist, "For the report". Somebody's homework. Third row down says "Labels show... 1 node".
That is what I want -- labels. Let me open that.

## 03 -- click the Labels row

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels show"

A black bar comes up: "Labels shown anyway (this file): Valjean. Opens in the inspector (not
available yet)". Not available yet. Great. And it says one node -- Valjean -- but I can count
fifteen names on the screen. So which is it? Side panel says one, the chart shows fifteen. That
is exactly the thing that makes me stop trusting a tool.

## 04 -- click "Label" in the right-hand panel

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Label"

The right panel is about PageRank and has a "Label" heading with a plus next to it. I clicked it.
Nothing happened. Anyway I do not want labels on "PageRank", I want them on the people.

## 05 -- click "Everything"

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything"

Bottom of the list, "Everything". Right panel: "Paints 77 nodes, 254 edges." OK, that sounds like
the whole chart. Fill, Shape (faceted sphere -- why is a person a faceted sphere), and again a
"Label" with a plus.

## 06 -- click "Label" under Everything

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"

Nothing. Same screen. The plus does not open. Is there a way to just turn names on?

## 07, 08 -- look for the plus by name, hover it

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add label"
    -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Label"
    -> tooltip: null

No tooltip, no "add label". The plus is just a plus.

## 09 -- hover around for a labels switch

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "More"
    -> nothing on screen is called "More"
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Labels"
    -> tooltip: "Labels shown anyway (this file) Double-click to rename"
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Show labels"
    -> nothing on screen is called "Show labels"

The only thing called Labels is that row, and its tip tells me how to rename it. I do not want to
rename it. I want it to show everyone.

## 10, 11 -- the Data side, the "label" column

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Data"
    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Data" --click "label"

That took me to a "Data" page. There is the column: "label -- Name, Label", 77 of 77 nodes have a
value. So the names are in there. At the bottom: "Painted by: No row paints from label." But the
chart is showing fifteen names. So something is painting from label and the panel says nothing is.
Again the panel and the picture disagree. No button here to put it on the chart either.

## 12, 13 -- main menu

    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Menu"
    -> tooltip: "Main menu"
    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Main menu"

In i2 this would be under View. Menu has Save, Export, Settings, "Select where...", "Show hidden
elements". Nothing about labels.

## 14 -- Style tab

    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Style"

Back on PageRank. Same Label plus that does nothing.

## 15, 16 -- the graph name at the top, then Style

    timeout 120 node app-b/study.mjs --try D/15.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances"
    timeout 120 node app-b/study.mjs --try D/16.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Co-appearances" --key Escape --click "Style"

Clicking the graph name opened a dropdown (Compare graphs, "This version has no transform API"
-- whatever that means), and the right panel switched to the whole graph with Style / Layout /
Data tabs. That looked promising. I pressed Escape to close the dropdown and the right panel went
back to PageRank. Clicked Style and I am on PageRank again.

That is it. I am done.

## Wrap-up

Did I succeed? No. I gave up. Fifteen or so names are on the chart, same as when I started.

Single Ease Question: 2 out of 7. Turning on names is the most basic thing you do to a link
chart -- in i2 it is on by default and it is one setting if it is not -- and here I found a row
called Labels that is "not available yet", two "Label" headings whose plus does nothing, and two
panels that told me one node and zero nodes have labels while I am looking at fifteen.

Would I use this instead of i2 and Excel? Not from this. I will give it credit: it says local
only and never uploaded, up front, and it let me say no to the data sharing in one click. That is
more than most. But I could not get names on dots in ten minutes, and I would have bailed after
three. If the side panel and the chart disagree about something as simple as how many names are
showing, I am not going to trust it with a number I have to repeat to a sergeant.
