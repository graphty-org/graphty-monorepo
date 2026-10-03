# Session: Les Miserables to a picture file -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional composite; persona file study/personas/gephi-holdout.md).
Viewport 1440x900. Renders in tmp/round-8-sessions/r8-t01--gephi-holdout/.

Moderator's task: get the Les Miserables network on screen, have the program work out something
about the characters, make the drawing show that result in its colors or sizes, get the names on
the drawing, and finish with a picture file to paste into a document. Say when each part is done.

All commands run from design/ui/prototype. `D` below is
`$PWD/tmp/round-8-sessions/r8-t01--gephi-holdout`. `$T NN [steps]` is the replay helper
tmp/r8-t01--gephi-holdout/try.sh: it runs `--try $D/NN.png task:r8-t01` with the steps No thanks,
Les Miserables, from Analyze, "Last run: Resolution 1.0, weight value", Update Louvain row,
"Louvain, 1 note", Alt+Space, then the extra steps given.

## 01 -- start screen (shots/tasks/r8-t01/01.png)

"A start page. Open, New from data, samples on the right. Les Miserables, 77 characters -- yes,
77 is right, that's the Knuth set. There's a consent box at the bottom; no, thanks. 'Files are
read on this computer and never uploaded' -- good, that's the first question I'd have asked."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"It opened with a whole stack of things already done: PageRank, Louvain, shortest paths, two
folders of groups. It's colored orange by PageRank and about fifteen names are shown. I didn't
ask for any of this. I want to see it raw first. Fine -- the network is on screen.
**Part one done.**"

"So the list on the left is... my Appearance panel and my statistics in one list? Rows with eyes.
That's layers, like Photoshop. Not my words, but I can map it."

## 03 -- hover Louvain

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Louvain"

Tooltip: "Louvain, resolution 1.0". "Good, it tells me the resolution. That's what I want on a
community row."

## 04 -- look for Statistics

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "from Analyze"

"There's no Statistics panel. The PageRank inspector said 'Measure from Analyze', so Analyze is
where statistics live. It opened a picker: Recent Louvain, PageRank, then Degree, Betweenness,
Closeness, Eigenvector. And the right side now shows the graph summary: 77 nodes, 254 edges,
undirected, density 0.0868, one component. Those match what I know of this graph. Fine."

## 05 -- open Louvain

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Last run: Resolution 1.0, weight value"

"Modularity -- they call it Louvain, which is at least the honest name of the algorithm. Weight
column, 'stronger' meaning bigger weight is a closer tie, resolution 1.0, all 254 edges used.
That's the parameters on the screen. No seed shown here, no randomize toggle. 'Run as copy' or
'Update Louvain row'. I'll rerun it in place."

## 06 -- rerun

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Last run: Resolution 1.0, weight value" --click "Update Louvain row"

"'6 communities, the same as before.' Modularity 0.565. Seed 7 -- there it is, in the result,
not the dialog. And the communities have a hub name next to them: Gavroche, Valjean, Myriel,
Fantine, Thenardier, Gillenormand. That is genuinely nicer than 'class 4'. It ran on the full
graph, it says so at the top: 'Full graph'. **Part two done** -- it worked out the communities."

"But the drawing is still orange. Still PageRank."

## 07 -- Louvain's style

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 [same as 06] --click "Style"

"'Covered by PageRank for Color on 77 of 77.' So the PageRank row above it wins. Ordering
matters. Okay, then I hide PageRank."

## 08-09 -- hide PageRank

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 [same as 07] --click "PageRank" --hover "Hide"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t01 [same as 07] --click "PageRank" --click "Hide PageRank"

Tooltip: "Hide PageRank. Alt-click or Alt+Space: show only this row."

"I clicked hide. The eye is crossed out. The drawing is still orange, and the legend at the top
left still says 'Color: PageRank'. And the Louvain row folded back up and lost its 'just now'.
So which is it? Is PageRank hidden or isn't it? This is the thing I don't trust in Gephi --
the panel says one thing and the canvas shows another."

## 10 -- look for a row menu

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 [same as 07] --click "PageRank" --hover "More"   -> nothing on screen is called "More"
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 [same as 07] --click "PageRank" --click "..."   -> nothing on screen is called "..."
    (probing the row's three-dot button: "Actions" gave "Quick actions Ctrl+K", "Options" gave
    "List options", "Menu" gave "Main menu", "More actions" matched nothing)

"I can't even find out what the three dots on the row are called. Moving on."

## 11-12 -- show only Louvain (the tooltip's Alt+Space)

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Louvain, 1 note" --key Alt+Space
    $T 12   (helper replaying: No thanks, Les Miserables, from Analyze, Last run..., Update Louvain row, "Louvain, 1 note", Alt+Space)

"The tooltip said Alt+Space shows only this row. That worked: six community colors, and a legend
with Community 1 to 6 and their sizes. Nobody would find that except from a tooltip, and the
plain eye button didn't do it. And now the inspector says the run was 'Sep 28' -- I ran it a
minute ago and it said 'just now'. And it still says 'Covered by PageRank' with PageRank grayed
out. Small things, but a reviewer reads dates. **Part three done, on screen.**"

## 13-19 -- names on the drawing

    $T 13 --click "Label"                                   (nothing visible happened)
    $T 14 --click "Labels show"                             -> toast "Labels shown anyway (this file): Valjean. Opens in the inspector (not available yet)"
    $T 15 --hover "Add label"                               -> nothing on screen is called "Add label"
    (probe: "Add" matched "Add to Shape / Effects / Label / Tooltip")
    $T 15 --click "Add to Label"                            -> menu: Label line, Show labels
    $T 16 --click "Add to Label" --click "Show labels"      -> a "Show labels" checkbox, unticked
    $T 17 --click "Add to Label" --click "Show labels" --click "Show labels"   -> ticked; canvas unchanged
    $T 18 --click "Add to Label" --click "Label line"       -> attribute picker: label, group, betweenness, degree, Louvain, PageRank, notes
    $T 19 --click "Add to Label" --click "Label line" --click "Name, Label"

"In Gephi it's the T at the bottom of the graph window. Here the Labels row said 'not available
yet'. Then the plus next to Label gave me 'Show labels' -- I ticked it and nothing changed, same
fifteen names. Why is there a checkbox that does nothing? Then 'Label line', pick the 'label'
column, and now every name is on. Seventy-odd names, and the middle around Valjean and the
Thenardiers is a pile of overlapping text. No label adjust, no prevent overlap that I can see.
In Gephi I'd run Label Adjust. Still -- the names are written. **Part four done, on screen.**"

## 20-24 -- export

    $T 20 --click "Add to Label" --click "Label line" --click "Name, Label" --click "Main menu"
    $T 21 [...same] --click "Main menu" --click "Export..."
    $T 22 [...same] --key Control+e
    $T 23 [...same] --key Control+e --click "PNG"           -> PNG, JPEG, WebP, SVG
    $T 24 [...same] --key Control+e --click "show list"

"I opened the main menu and the drawing went back to orange. PageRank is painting again and my
communities are gone. I opened Export with Ctrl+E instead -- same thing, the preview is orange,
the legend says 'Color: PageRank'. So my 'show only Louvain' was a view trick, not a state.
Opening a menu throws it away."

"And '64 labels hidden to avoid overlap'. Sixty-four of seventy-seven. I spent four tries putting
the names on and the export takes most of them off, by degree -- Thenardier, Joly, Mabeuf... I
didn't ask it to decide that. There's no switch next to it to keep them. SVG is in the list,
which is the one good surprise here."

## 25-29 -- try again: hide PageRank for real, then export SVG

    timeout 120 node app-b/study.mjs --try $D/25.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Last run: Resolution 1.0, weight value" --click "Update Louvain row" --click "Style" --click "Add to Label" --click "Label line" --click "Name, Label" --click "Covered by"
    timeout 120 node app-b/study.mjs --try $D/26.png task:r8-t01 [same as 25 without "Covered by"] --click "PageRank" --click "Hide PageRank"
    timeout 120 node app-b/study.mjs --try $D/27.png task:r8-t01 [same as 26] --key Control+e
    timeout 120 node app-b/study.mjs --try $D/28.png task:r8-t01 [same as 27] --click "PNG" --click "SVG"
    timeout 120 node app-b/study.mjs --try $D/29.png task:r8-t01 [same as 28] --click "Export"

"PageRank hidden -- eye crossed -- and the canvas is still PageRank orange. The inspector even
says 'Covers Louvain for Color'. So hide doesn't hide. I exported anyway, SVG: 'Exported
les-miserables.svg to Downloads'. It's a file. It has the PageRank ramp I didn't make, a legend
for it, and thirteen names."

## 30 -- one last look: Print

    timeout 120 node app-b/study.mjs --try $D/30.png task:r8-t01 [same as 27] --click "Print"

"Print shows a gray version and says the colors are a PageRank ramp and the legend will print
values at each gray step. That's thoughtful, honestly -- a gray legend with values is what I'd
build in Inkscape. Still PageRank. Still 64 names gone. I'm stopping."

## Verdict

**Did I succeed?** No. I have a picture file, and on screen I had the communities colored with
all the names written. But the file I'd paste into a document is colored by PageRank, which the
sample came with and I never chose, and it carries 13 of 77 names. The two things I actually did
-- the community coloring and the names -- did not reach the file. Done on screen: loading,
computing communities, coloring by them, labels. Not done in the file: coloring, labels.

**Single Ease Question: 3 of 7.**

**Would I use this instead of Gephi?** No. The Louvain result panel is better than Gephi's --
hub names on communities, the seed, the modularity score and "full graph" all in one place --
and an SVG with a legend and a gray print preview would take Inkscape out of my afternoon. But
the eye button marked PageRank hidden while it kept painting, the communities only showed through
a keyboard trick that a menu click undid, a "Show labels" checkbox did nothing, and the export
silently dropped most of the names I had just put on. I can't hand students a tool where the
panel and the picture disagree. I'd stay on Gephi.

## Problems observed (participant's words, ranked)

1. Hiding the PageRank row (eye crossed) does not repaint the canvas; the legend and canvas stay
   PageRank, and the inspector still says PageRank "covers Louvain". (09, 26)
2. "Show only this row" (Alt+Space) colors by Louvain, but opening the main menu or Export puts
   PageRank back; the export preview never shows Louvain. (12, 20, 21, 22)
3. Export hides 64 of 77 labels "to avoid overlap" with no way shown to keep them. (21, 24)
4. The opened sample arrives with PageRank coloring every node, so a newcomer's first coloring
   attempt is buried under a row they did not make.
5. Label: "Show labels" checkbox ticked with no change on the canvas; the Labels row says "not
   available yet"; only "Label line" + picking the label column worked. (14, 17, 19)
6. After rerunning Louvain the inspector first said "just now", then "Sep 28". (06, 12)
7. Full labels on screen overlap heavily in the center; no label-adjust or prevent-overlap. (19)
8. The row's three-dot button has no name a pointer reveals. (10)
