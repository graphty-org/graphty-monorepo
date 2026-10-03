# Session: first sitting with the Les Miserables sample -- Maren (genomics postdoc, Cytoscape user)

Task as given by the moderator: "You have never used this program before. A friend said it turns a list of connections into a picture that shows who matters and how people cluster. You have no file of your own today, so you will practice on the ready-made network of characters from the novel Les Miserables that comes with the program. In one sitting: get that network on screen, have the program work out something about the characters (for example who matters most, or which of them belong together), make the drawing show that result in its colors or sizes, get the characters' names written on the drawing, and finish with a picture file you could paste into a document. Say out loud when you think each part is done."

Participant: played as Maren, from study/personas/genomics-cytoscape-user.md. 14-inch laptop, 1440 x 900.

All commands were run from design/ui/prototype. `S` is tmp/round-8-sessions/r8-t01--genomics-cytoscape-user. Every --try run replays from the start screen.

---

## 01 -- start screen (shots/tasks/r8-t01/01.png)

Maren: "OK. Open project, New from data, drop a file. Samples on the right -- Les Miserables, 77 characters, there it is. And there's a usage-data box across the bottom. 'Files are read on this computer and never uploaded' -- good, that's the first thing my PI would ask. I'm saying no to the usage data; I don't share anything by default."

## 02 -- decline usage data, open the sample

```
timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"
```

Maren: "Network's up. Flat, 2D, white-ish background -- good, not some spinning 3D thing. **Part one done: the network is on screen.**

But hang on -- it's already colored. Orange to brown, legend says PageRank 0.0033 to 0.0754. And there's a whole list on the left: PageRank, Louvain 6 groups, Shortest paths, Top 9 by degree, Watchlist, 'For the report', Betweenness... Somebody already did the analysis. The sample description did say 'opens with worked examples', but for a practice run that's like opening a Cytoscape session file someone else built. I don't know what I did versus what was there. I want to run something myself."

## 03 -- looking for where you run an analysis

```
timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
```

Tooltip: "Analyze Shift+A".

Maren: "Bottom toolbar is icons only. The flask is 'Analyze' -- I'd only know that because I rested the pointer on it. A flask for analysis, fine, I'll buy it."

## 04 -- Analyze opened

```
timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"
```

Maren: "A list. Recent: Louvain, PageRank, Shortest path. Then 'Rank nodes and edges': PageRank ('Start here'), Degree, Total value, Betweenness, Closeness, Eigenvector. Each has a one-line meaning, which I'll admit is nicer than cytoHubba's list of acronyms. Degree -- 'how many edges each node has'. That's hubs. That's what I'd do. Degree."

## 05 -- Degree

```
timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree"
```

Maren: "No dialog, it just went. Right side: a histogram, '77 of 77 have a value; Degree 1 to 36, median 6'. And a Top 10: Valjean 36, Gavroche 22, Marius 19, Javert 17... with ties marked '6=' and '8='. Good -- it tells me how many have a value. That's the count I always want and never get. **Part two, I'd say done: it worked out degree, Valjean is the hub.**

But the drawing hasn't changed at all. Still PageRank orange. And I don't see 'Degree' anywhere in the list on the left. Where did it go?"

## 06 -- Style tab for Degree

```
timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style"
```

Maren: "Style tab. 'Paints 77 nodes'. Shape: Size '0.5 to 3'. So it's supposed to be sizing nodes by degree already? Then Valjean should be three, six times bigger than the leaf characters. Look at the picture: everything's the same size. Valjean's node is darker, that's PageRank, but not bigger. Either the size is so small I can't see it, or it's not actually applied. That's exactly the Cytoscape thing where the mapping is there but the network doesn't change until you poke it."

## 07, 08 -- trying to add a color for Degree

```
timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "Fill"
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --hover "Add fill"
   -> nothing on screen is called "Add fill"
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "+"
   -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --hover "Fill"
   -> tooltip: null
timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "Size"
```

Maren: "Fine, forget size, I'll color by degree. 'Fill' with a little plus. Clicked Fill -- nothing. The plus has no name when I hover it. Clicked Size -- a little database icon and a minus showed up next to it, no explanation. Still same picture. I'm now clicking things without knowing what they do, which is what I said I wouldn't do."

## 09 -- trying Louvain instead

```
timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Louvain, 1 note"
```

(An earlier attempt with just "Louvain" landed on the Louvain tab at the bottom instead of the list row.)

Maren: "OK, the other half of the task -- 'who belongs together'. Louvain, 6 groups. That's my MCODE step, basically. Inspector says Fill Color 'Louvain comm...' -- and above it: 'Covered by PageRank for Color on 77 of 77'. Oh. So the PageRank coloring is sitting on top and hiding the groups. Like two styles fighting, and the top one wins. At least it tells me that, which Cytoscape never would."

## 10-12 -- hiding PageRank so the groups show

```
timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Louvain, 1 note" --click "PageRank"
timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Louvain, 1 note" --click "PageRank" --hover "Hide"
   -> tooltip: "Hide PageRank Alt-click or Alt+Space: show only this row"
timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Louvain, 1 note" --click "PageRank" --click "Hide PageRank"
```

Maren: "Clicked PageRank, it shows 'Covers Louvain for Color'. The eye on the row says 'Hide PageRank'. Hide it. ... The eye is crossed out now. The drawing: still orange. Legend: still 'Color: PageRank'. So I hid it and nothing happened. Now I genuinely don't know whether what I'm looking at is what the panel says. That's the one thing I can't have -- if the picture and the settings disagree, I can't put it in a figure."

## 13, 14 -- names on the drawing

```
timeout 120 node app-b/study.mjs --try $S/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Labels"
   -> toast: "Labels shown anyway (this file): Valjean. Opens in the inspector (not available yet)"
timeout 120 node app-b/study.mjs --try $S/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Style" --click "Label"
```

Maren: "Names. Some are already there -- Valjean, Javert, Marius, Fantine, Myriel, maybe fifteen of them. Not all 77. There's a row 'Labels show... 1 node'. Clicked it: 'not available yet'. Tried 'Label' under the Style tab -- nothing happened, same as Fill. **Names: partly done, and not by me.** I can't find how to turn them all on."

## 15-18 -- Export

```
timeout 120 node app-b/study.mjs --try $S/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Menu"
   -> ambiguous; opened "Main menu"
timeout 120 node app-b/study.mjs --try $S/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..."
timeout 120 node app-b/study.mjs --try $S/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..." --click "show list"
timeout 120 node app-b/study.mjs --try $S/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..." --click "Print"
```

Maren: "Hamburger menu: Save, Export (Ctrl+E). Export dialog: Image .png, 'Full graph, with the legend'. With the legend! That alone is a thing I've fought Cytoscape over. Preview shows the legend box in the corner.

'64 labels hidden to avoid overlap: show list' -- and it lists them, Thenardier degree 16, Joly 12, Mabeuf 11... So it's honest that it dropped 64 names. I'd rather it told me than silently drop them, but I still want the names. And it says degree there, so it does know about my Degree run.

Print look: side by side, color and 'in gray, as a black-and-white print shows it', with the gray steps labeled with values. That's genuinely useful -- my PI is colorblind and that's the closest thing to a check I've seen. Still no way to get the 64 names back from here though."

## 19, 20 -- an accidental discovery about Degree

```
timeout 120 node app-b/study.mjs --try $S/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..." --click "show list" --click "Thenardier"
timeout 120 node app-b/study.mjs --try $S/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..." --click "show list" --click "Thenardier"  --click "Show Degree"
   -> nothing on screen is called "Show Degree"
timeout 120 node app-b/study.mjs --try $S/20.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Degree" --click "Main menu" --click "Export..." --click "show list" --click "Thenardier"  --click "Degree"
```

Maren: "Clicking Thenardier in that list closed the export and selected him. Right side: 'Why this look'. PageRank: Color, covers Louvain, Shortest paths, Top 9 by degree, Watchlist and Betweenness. Then 'Degree' in gray italics with a crossed-out eye: Size. So that's why the sizes never changed -- my Degree came in switched OFF. Nobody told me that when I ran it. I tried to switch it on -- clicked 'Degree' there and it just took me back to the same Degree style panel, which doesn't say it's hidden anywhere. And it isn't in the left list either, so there's no eye for me to click."

## 21-23 -- one more try: run something new, Betweenness

```
timeout 120 node app-b/study.mjs --try $S/21.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
   -> ambiguous; clicked the list row; timed out
timeout 120 node app-b/study.mjs --try $S/21.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit"
timeout 120 node app-b/study.mjs --try $S/22.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit" --click "Run"
timeout 120 node app-b/study.mjs --try $S/23.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit" --click "Run" --click "Betweenness 2"
```

Maren: "Betweenness -- 'which nodes sit on the most shortest paths between others'. This one has a proper form: Weight 'value (loaded weight)', Higher means Stronger / Farther / Capacity, 'all 254 edges have value set; none is left out', 'Under a second', Run. I'd have to think about Stronger vs Farther and I don't want to, I'll leave the default. Run.

A row 'Betweenness 2' at the top of the list with a spinner. Clicked it. Still spinning. It said under a second. Drawing unchanged."

## 24 -- give up on my own result, export what's there

```
timeout 120 node app-b/study.mjs --try $S/24.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"
```

Toast: "Exported les-miserables.png to Downloads".

Maren: "I'm stopping. I'll export what's on screen: the PageRank coloring that came with the sample, its legend, and the dozen names it chose to show. **Picture file: done** -- les-miserables.png in Downloads, with a legend, which I'll give it credit for. But it's not what I made."

---

## Debrief

**Did you succeed?** "Partly. The network was on screen in two clicks, and I got a picture file out with a legend in it. The program did work out degree for me, and that Top 10 with the '77 of 77 have a value' line is good. But I never got the drawing to show my result. The colors in my picture are PageRank, which was already there when I opened it -- I didn't do that. My Degree came in switched off and I couldn't find how to switch it on; hiding PageRank didn't change the picture; Betweenness never finished. And only about 13 of 77 names are on the picture; it told me 64 were hidden but I couldn't get them back. So: on screen yes, analysis yes, shown in the drawing no, names partly, picture file yes."

Parts she declared done: network on screen (step 02); analysis worked out (step 05, Degree); picture file (step 24). Parts she did not reach: drawing showing her own result; all names on the drawing.

**Single Ease Question (1-7):** 3. "The first two minutes were a 6. Then I spent the rest clicking plus signs that did nothing."

**Would you use this instead of Cytoscape?** "Not today. A few things are better than what I have: it tells me how many nodes got a value, it tells me when one style is covering another, it exports the legend, and the gray-print preview is something I'd actually show my PI. But the moment I hid a style and the picture didn't change, I stopped trusting the picture, and a figure I don't trust is no figure. Also the sample being pre-loaded with ten analyses made it hard to tell what I'd done. And I'd still need to know: does it do the STRING query, is there clustering I can cite, how do I cite the tool in methods? If those aren't there, I'd leave for half my pipeline anyway, so why not stay in Cytoscape. Maybe for poking around. The paper figure stays in Cytoscape."
