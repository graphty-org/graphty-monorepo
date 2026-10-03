# Session: first sitting with the Les Miserables sample -- Jordan, marketing network analyst

Task as given by the moderator: get the Les Miserables network on screen, have the program
work out something about the characters, make the drawing show that result in colors or
sizes, get the characters' names on the drawing, and finish with a picture file for a
document. Say when each part is done.

All commands were run from design/ui/prototype. `D` is
tmp/round-8-sessions/r8-t01--marketing-analyst. Every run starts from the start screen.

## Start screen (shots/tasks/r8-t01/01.png)

"OK. Start, recent projects, samples. Les Miserables, 77 characters, right there on the
right -- good, I don't have to hunt. 'Files are read on this computer and never uploaded'
and a 'Local only' chip up top. That's the first thing I'd ask about with customer data, so,
fine, noted. There's a usage-data banner at the bottom. No thanks. I always say no thanks."

## 1. Get the network on screen

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"There it is. Hairball-ish but small, readable. Huh -- it's already colored. 'Color:
PageRank' in a little key at the top left, orange to brown. And the list on the left already
has PageRank, Louvain six groups, shortest paths, a watchlist, 'For the report'... The sample
card did say 'opens with worked examples'. So somebody already did the homework. That's
nice for a demo, but the task says I make the program work something out, so I'm not
counting that."

"Part one: done. The network is on screen."

"The left column is a lot. Fifteen rows and I've done nothing. I don't know what 'Everything'
is, or '1 row not listed still paints'. I'm skipping that."

## 2. Have the program work something out

"I'd look for a button that says 'Find influencers' or 'Communities'. I don't see one. There's
a little toolbar at the bottom of the map with icons. The flask -- that's usually 'analyze' or
'lab'."

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"

"Tooltip says 'Analyze, Shift+A'. Good guess."

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"OK, this I like more. A list, with a sentence under each one. 'PageRank -- which nodes are
connected to other well-connected nodes', 'Degree', 'Betweenness -- which nodes sit on the
most shortest paths between others'. That's my bridge people, the ones between the groups.
The sentences are what I'd paste into a brief. I don't need PageRank, it's already on there.
Betweenness."

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
    (the tool said "Betweenness" matched two things, the list row on the left and the Analyze entry, and the click did not land; nothing changed)
    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"Settings panel. Weight, 'Higher means: Stronger, Farther, Capacity'. I'm not reading all of
that, it's the kind of thing I accept the default on. Bottom left says 'Under a second'. Good,
it told me how long. Run."

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"A new row popped in on the left, 'Betweenness 2', with a spinner and a little blue progress
line. 'Betweenness 2' -- because there's already a Betweenness further down, I guess, the
greyed-out one with the crossed eye. Fine. The map is still orange PageRank."

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"

"I clicked it. Still spinning. The right panel still shows the graph summary, not my
betweenness. It said under a second."

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Table"

"Let me look at the table, maybe the numbers landed there. Table opens under the map --
label, group, degree, rank by degree, PageRank, rank by PageRank. No betweenness column.
And there's a line, 'Valjean is first on all three measures' -- three? I count two. Maybe the
third is off to the right. Whatever. The spinner on the left is still going. That's my
'came back from lunch to a spinning wheel' moment, except it's been a few clicks, not lunch."

"So part two -- I don't think my own run finished. Technically the program had already worked
something out, PageRank and Louvain, when it opened. I'll take the Louvain groups, that's the
'who belongs together' one, and see if I can put that on the map."

## 3. Make the drawing show a result

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2" --click "Louvain"
    (this opened the Louvain tab of the table, not the list row)

"Six communities, 'Community 1' to 'Community 6', size, density, edges inside, edges leaving.
Community 1, Community 2... yeah, that's the 'why did someone land in cluster 7' problem.
No names. But fine, it's a novel."

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Louvain, 1 note"

"Clicked the Louvain row on the left. Right side: 'Louvain. Paints 77 nodes. Covered by
PageRank for Color on 77 of 77.' Oh. So Louvain IS coloring them, but PageRank is on top and
wins. That sentence is actually useful, it tells me why I'm seeing orange. So I hide PageRank."

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "PageRank" --hover "Hide"

"Eye icon on the PageRank row: 'Hide PageRank'."

    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "PageRank" --click "Hide PageRank"

"The eye is crossed out now. The map... is still orange. The key at the top still says
'Color: PageRank'. The right panel still says 'Covers Louvain for Color'. So I hid it and
nothing happened. That's the second thing that didn't do what it said. And Betweenness 2 is
STILL spinning."

    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "PageRank" --click "Hide PageRank" --hover "Show Betweenness" --click "Show Betweenness"

"One more go: the old Betweenness row at the bottom has a yellow swatch and a crossed eye.
Show it. The eye opens. The map doesn't change. Still orange, still 'Color: PageRank'."

"OK, I'm done fighting the colors. Two things failed with no explanation; in real life I'd
stop trying this path. The map does show a result -- PageRank, darker is more central, Valjean
is the dark one in the middle, which is what I'd expect for the main character, so I believe
it. But I didn't put it there, and I couldn't put mine there. Part three: I'll call it done
only because it came done."

(Off topic, while waiting:) "This is exactly what happened with the listening suite last
quarter -- the dashboard said one thing, the export said another, and I spent a day on the
phone with their support. At least here nothing left my laptop."

## 4. Get the characters' names on the drawing

"Some names are already on there: Valjean, Javert, Fantine, Cosette, Marius, maybe a dozen.
I want all of them. There's a row 'Labels show... 1 node'."

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels show"

"Message at the bottom: 'Labels shown anyway (this file): Valjean. Opens in the inspector
(not available yet).' Not available yet. Great. And 'shown anyway' -- I don't know what that
means. Shown anyway despite what?"

    timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Label"

"On the right there's 'Label' with a plus. I clicked 'Label'. Nothing visible changed."

    timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add label"

"Nothing called 'Add label'. I don't know what that plus is called. I'm not going to hover
over every plus sign on the screen."

"Part four: partly. A dozen of the main names are on the map. I could not find how to show the
rest."

## 5. Picture file

"Export. Hamburger menu, top left."

    timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Menu" --click "Menu"

"New project, Open, Save, Export with Ctrl+E. Good, it's where I'd expect."

    timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

"Now THIS is good. 'Image .png -- Full graph, with the legend.' With the legend! There's the key
in the corner of the preview. That's the 'what's purple' problem from my last VP meeting,
solved without PowerPoint. Preset 'To share -- PNG, 2x'. 'Saved to this computer only;
nothing is uploaded.' And there's a 'Data' tab on the left, so I bet the CSV is in here too --
I'd check that next time, that's my real deal-breaker."

"'64 labels hidden to avoid overlap: show list'. So that's where my names went."

    timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "show list"

"It's a list of who's hidden: Thenardier, degree 16; Joly, 12; Mabeuf... Thenardier is hidden?
He's a main character. OK, but it only lists them, there's no 'show them anyway' that I can see.
At least it's honest that they're missing, which is more than Gephi does. I'll take it."

    timeout 120 node app-b/study.mjs --try $D/21.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

"'Exported les-miserables.png to Downloads'. Done. Part five: done."

## Wrap-up

**Did I succeed?** Half. I have a PNG with colors that mean something, a legend on it and
about thirteen names. But the coloring was already there when the sample opened. The thing I
asked for myself, betweenness, never stopped spinning even though it said under a second. When
I tried to switch the map to the communities by hiding PageRank, the eye toggled and the
picture did not change. And I could not get all the names on. If my manager asked "what did you
do?", the honest answer is "I opened the sample and pressed Export."

**Single Ease Question:** 3 out of 7.

**Would I use this instead of my current tool (Gephi, plus the listening suite)?** Not yet.
The Analyze list with plain sentences under each measure is better than Gephi's statistics
panel, the "covered by PageRank" sentence actually explained why I saw orange, and an image
export that includes the legend and says nothing is uploaded saves me the PowerPoint step and
the legal question. Those are real. But a computation that does not finish and a hide button
that does not change the picture are two unexplained failures in ten minutes, and that is my
limit. And the sample opening with fifteen layers already stacked made it harder, not easier,
to see what my own clicks did. I would come back if a fresh run visibly lands on the map and I
can get a CSV of the top 40 out of that Data tab.

## Problems observed

1. Betweenness run promised "Under a second" but its row kept spinning through every
   following step; no result appeared in the table, the map or the inspector.
2. Hiding the PageRank row (and showing the older Betweenness row) toggled the eye icon but
   left the map, the legend chip and the inspector text unchanged.
3. The sample opens with about fifteen pre-built layers; the first-time reader cannot tell
   what is theirs, and the task "have the program work something out" is already done for them.
4. No discoverable way to put all names on the drawing: the Labels row says "not available
   yet", the Label plus on the right has no findable name, and Export only lists the 64 hidden
   labels with no option to show them.
5. "Valjean is first on all three measures" above the table, with only two measures visible.
6. "Betweenness 2" naming next to an existing hidden "Betweenness" is unexplained.
7. Louvain communities are named "Community 1" to "Community 6" with no hint of who is in them.
