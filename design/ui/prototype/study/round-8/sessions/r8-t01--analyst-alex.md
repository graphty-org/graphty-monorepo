# Session: Les Miserables, first sitting -- Analyst Alex

Participant: Analyst Alex (intermediate graph analyst, Gephi and NetworkX user).

Task as given by the moderator: "You have never used this program before. A friend said it turns
a list of connections into a picture that shows who matters and how people cluster. You have no
file of your own today, so you will practice on the ready-made network of characters from the
novel Les Miserables that comes with the program. In one sitting: get that network on screen, have
the program work out something about the characters (for example who matters most, or which of
them belong together), make the drawing show that result in its colors or sizes, get the
characters' names written on the drawing, and finish with a picture file you could paste into a
document. Say out loud when you think each part is done."

All commands were run from `design/ui/prototype`. `D` is
`design/ui/prototype/tmp/round-8-sessions/r8-t01--analyst-alex`. Every run replays from the start
screen.

## Start screen (shots/tasks/r8-t01/01.png)

> OK. Left: "Open project or file", "New from data". Under that: "Files are read on this computer
> and never uploaded." Good, that's the first thing I look for, and it's right there next to the
> open button, not in a privacy page. Top right says "Local only" too. Fine.
>
> There's a banner at the bottom asking to share usage data. No thanks. Samples on the right --
> Les Miserables, 77 characters. That's the NetworkX one, 77 nodes, 254 edges if I remember right.

## Step 1 -- open the sample

```
timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t01 --click "No thanks" --click "Les Miserables"
```

> Huh. It's already... done? Everything is orange, there's a legend that says "Color: PageRank
> 0.00330 to 0.0754", a list on the left with PageRank, Louvain 6 groups, Shortest paths, Density,
> Link prediction, "Top 9 by degree", "Watchlist", a folder "For the report", a hidden Betweenness.
> I didn't do any of this. The card did say "opens with worked examples" but I skimmed it. So now
> I can't tell what's mine and what's the demo's. I'd rather have a clean graph and do it myself.
>
> Names: only about thirteen are written on -- Valjean, Javert, Fantine, Myriel, Marius, Gavroche,
> Enjolras... The rest are bare dots.
>
> Where are the counts? Not on this screen. Let me find somewhere to run something.

**Part 1 (network on screen): done.**

## Step 2 -- find where to run an algorithm

The right-hand panel said the PageRank measure was "from Analyze", so I went looking for Analyze.

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
```
Tooltip: "Analyze Shift+A" -- it's the flask icon at the bottom.

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"
```

> OK, this is good. A list with one-line descriptions: PageRank, Degree, Total value,
> Betweenness, Closeness, Eigenvector... and a search box. And the right panel now shows a
> Summary: 77 nodes, 254 edges, undirected, one connected component, average degree 6.60, max 36.
> That matches NetworkX. Good, I'll keep going.
>
> There's a little clock icon next to Betweenness and Closeness. I guess that means slow. On 77
> nodes? Whatever. I always start with betweenness.

## Step 3 -- run betweenness

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"
```
(My first try, `--click "Betweenness"`, hit the hidden Betweenness row in the list instead and
timed out.)

> Settings: weight "value (loaded weight)", "Higher means: Stronger / Farther / Capacity", and a
> note that betweenness reads weight as distance, 1/value. Hm -- NetworkX's default betweenness is
> unweighted, so these numbers won't match mine unless I switch weight off. I'll let it be for now.
> Bottom says "Under a second". Run.

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"
```

> A new row "Betweenness 2" at the top of the list with a spinner and a little progress bar.
> "2" -- because there's already a Betweenness from the demo. The picture is still PageRank orange.

```
timeout 120 node app-b/study.mjs --try $D/06.png ... --click "Run" --click "Betweenness 2"
timeout 120 node app-b/study.mjs --try $D/07.png ... --click "Run" --hover "Betweenness 2" --hover "Graph" --hover "Betweenness 2"
```

> Still spinning. It said under a second. The tooltip on the row only tells me the name can't be
> changed -- not how far along it is, not whether it's stuck. Is it doing anything? On 77 nodes
> this should be instant. At work this is where I'd reload the page.

## Step 4 -- try to get the existing Betweenness onto the drawing instead

```
timeout 120 node app-b/study.mjs --try $D/08.png ... --click "Run" --click "Betweenness"
```

> The demo's Betweenness row: "Covered by PageRank for Color", with a "Move above" button. OK, so
> PageRank is on top. That's actually a clear message. Move above.

```
timeout 120 node app-b/study.mjs --try $D/09.png ... --click "Betweenness" --click "Move above"
```

> Toast: "Moved Betweenness above PageRank". But the row is still at the bottom of the list, the
> eye is still crossed out, the dots are still orange and the legend still says PageRank. So did
> it move or not?

```
timeout 120 node app-b/study.mjs --try $D/10.png ... --click "Move above" --hover "Show"
```
Tooltip: "Show Betweenness Alt-click or Alt+Space: show only this row".

```
timeout 120 node app-b/study.mjs --try $D/11.png ... --click "Move above" --click "Show Betweenness"
```

> Eye's open now, panel says "Covers PageRank for Color", yellow-to-orange. And the picture?
> Exactly the same orange, legend still "Color: PageRank". The panel and the drawing disagree.
> I don't know which one to believe, and the drawing is the thing I'd paste in a deck.

```
timeout 120 node app-b/study.mjs --try $D/12.png ... --click "Show Betweenness" --click "Hide PageRank"
```
"nothing on screen is called Hide PageRank" (the eye only shows on the selected row).

```
timeout 120 node app-b/study.mjs --try $D/12.png ... --click "Show Betweenness" --hover "PageRank" --click "Hide PageRank"
timeout 120 node app-b/study.mjs --try $D/12.png ... --click "Show Betweenness" --click "PageRank" --hover "Hide"
timeout 120 node app-b/study.mjs --try $D/13.png ... --click "Show Betweenness" --click "PageRank" --click "Hide PageRank"
```

> I clicked the PageRank link in the panel to get to it and hid it. Now PageRank's eye is crossed
> out -- and the picture is STILL orange with a PageRank legend. And my "Betweenness 2" row is gone
> from the list, and Betweenness is hidden again. What happened to my run? I've lost track.

## Step 5 -- try communities instead

```
timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Last run"
```

> Louvain, resolution 1.0, same weight thing. Buttons "Run as copy" and "Update Louvain row". I'll
> update.

```
timeout 120 node app-b/study.mjs --try $D/15.png ... --click "Louvain Last run" --click "Update Louvain row"
```

> Now this I like. "Updated just now: 6 communities, the same as before." Seed 7, shown. Modularity
> 0.565 with a plain sentence: "Strong grouping: far more links fall inside the communities than
> between them." Communities listed with sizes and a hub name each -- Community 1 hub Gavroche, 25;
> Community 2 hub Valjean, 17; Myriel, Fantine, Thenardier, Gillenormand. That's something I can say
> to a director. Rerun and compare is offered. This is the best screen so far.
>
> But the drawing: all orange. Legend: PageRank.

**Part 2 (program works something out): done -- Louvain, 6 groups. Betweenness never finished.**

```
timeout 120 node app-b/study.mjs --try $D/16.png ... --click "Update Louvain row" --click "Style"
timeout 120 node app-b/study.mjs --try $D/17.png ... --click "Style" --click "PageRank" --click "Hide PageRank"
```

> Style tab: "Covered by PageRank for Color on 77 of 77". No Move-above button this time, unlike
> betweenness. So I hid PageRank again. Picture: orange. Legend: PageRank. The Louvain list
> collapsed again. Nothing I do changes the picture. I give up on getting my own result painted.

**Part 3 (drawing shows the result): not done by me. The drawing shows PageRank, which the demo
put there, not anything I ran.**

## Step 6 -- names on the drawing

```
timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Label"
timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything" --hover "Add label"
timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels shown anyway"
timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Label"
timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Label"
```

> The panel has a "Label +" section. Clicking it does nothing, on Everything or on PageRank. There's
> a row "Labels shown anyway (this file) 1 node" -- clicking it says "Valjean. Opens in the
> inspector (not available yet)". So that's not it either.

```
timeout 120 node app-b/study.mjs --try $D/21.png ... --hover "Actions"   (Quick actions Ctrl+K)
timeout 120 node app-b/study.mjs --try $D/21.png ... --hover "Layout"    (Layout)
timeout 120 node app-b/study.mjs --try $D/22.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Quick actions"
```

> A command box, "Type a command or a place". I'd type "labels" here, but nothing in the list says
> labels. I can't find a way to put all the names on.

**Part 4 (names on the drawing): partly. About 13 names are there from the start; I could not add
the rest.**

## Step 7 -- export a picture

```
timeout 120 node app-b/study.mjs --try $D/23.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Menu"
timeout 120 node app-b/study.mjs --try $D/24.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."
timeout 120 node app-b/study.mjs --try $D/25.png ... --click "Update Louvain row" --click "Main menu" --click "Export..."
timeout 120 node app-b/study.mjs --try $D/26.png ... --click "Export..." --click "show list"
timeout 120 node app-b/study.mjs --try $D/27.png ... --click "Export..." --click "Export"
```

> Main menu, Export..., Ctrl+E. That was easy. Image .png, "Full graph, with the legend", preview,
> 2x, 1,802 x 1,638. "Saved to this computer only; nothing is uploaded." Good.
>
> "64 labels hidden to avoid overlap: show list" -- oh, so THAT's why only 13 names show. It hides
> them on purpose. The list is by degree: Thenardier degree 16, Joly 12, Mabeuf 11 hidden. Thenardier
> hidden is a bit odd, he's a main character. Anyway this is the only place that told me about the
> labels, and it doesn't let me turn them back on from here.
>
> The preview is PageRank orange, not my Louvain groups. Export. "Exported les-miserables.png to
> Downloads." Fine.

**Part 5 (picture file): done.** It's a picture of the demo's PageRank coloring, with 13 of 77
names.

## Wrap-up

**Did I succeed?** Not really. I got the network up, the counts matched NetworkX, I ran Louvain and
got a genuinely good result panel, and I got a PNG out. But the picture in the PNG is the demo's
PageRank, not my communities, and most of the names aren't on it. If I pasted that in a deck and
someone asked "where are the groups you talked about", I'd have nothing.

**Single Ease Question: 3 out of 7.** What took longest: getting any result I ran onto the drawing.
Every panel told me something had changed ("Moved Betweenness above PageRank", "Covers PageRank")
and the picture never did. Second: betweenness said "under a second" and spun forever with no
cancel I could see.

**Would I use this instead of Gephi?** Not yet. Things I'd take today: the "files never uploaded"
line next to the open button, the counts on the summary, the one-line descriptions in Analyze, and
the Louvain result -- seed shown, "same as before", modularity explained in a sentence, communities
named by their hub. That's better than Gephi. But the whole point of the tool for me is the
picture, and I couldn't make the picture show what I computed. The sample opening pre-loaded with
someone else's analysis made it worse: I couldn't tell my rows from the demo's, and the demo's
PageRank kept winning. I'd still do the numbers in Python, and right now I'd still do the picture in
Gephi.
