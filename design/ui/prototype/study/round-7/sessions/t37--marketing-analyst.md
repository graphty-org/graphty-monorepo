# Session: look at one coloring result alone, then hide three characters without changing the counts

Participant: Jordan, marketing network analyst (study/personas/marketing-analyst.md)
Task as given: "Look at just one of the coloring results on its own for a moment. Then take three
characters out of sight while every count still includes them, and check that the numbers really
did not change."
Start screen: shots/tasks/t37/01.png
Renders: tmp/round-7-sessions/t37--marketing-analyst/01.png to 16.png
All commands were run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try <D>/NN.png task:t37 ...`, where
<D> = tmp/round-7-sessions/t37--marketing-analyst.

## Think-aloud

**Start (t37/01.png).** OK, Les Miserables, everything is orange-to-brown, legend says "Color:
PageRank". On the left there's a list -- PageRank, Louvain, Shortest paths, Watchlist, a folder
"For the report". The right panel says PageRank "Covers Louvain for Color", so the clusters are
already buried under it. "One coloring result on its own" -- I'd guess PageRank, it's the one
highlighted. There's a little eye on that row. In Gephi I'd just untick the other stuff.

**01** `--hover "PageRank"` -- Hovering the row. Nothing new. Same screen.

**02** `--hover "Show or hide"` -- "nothing on screen is called Show or hide". OK, the eye icon
isn't called that.

**03** `--hover "Hide"` -- There it is: "Hide PageRank. Alt-click or Alt+Space: show only this
row." So "show only this" is a hidden shortcut on the hide button. Fine, I'd never have found that
without hovering, and if I'd just clicked the eye I'd have hidden the exact thing I wanted to look
at. That's backwards.

**04** `--click "PageRank" --key "Alt+Space"` -- The other rows go pale, the eye turns blue. So I
guess I'm "solo" on PageRank now. The map looks... identical, honestly. PageRank was already
covering everything, so I can't tell anything changed except the list got faded. No banner, nothing
saying "showing PageRank only". I'll take it.

**05** `--click "PageRank" --key "Alt+Space" --click "Table"` -- Opened the table to get at the
numbers. 77 nodes, columns say "Degree (full graph)", "PageRank (full graph)", "Betweenness (full
graph)". Good, the "(full graph)" thing is exactly what I care about. But wait -- the left list is
back to normal, the eye is gray again. Opening the table un-soloed it? So "on its own" lasted
until my next click. Annoying, but that part of the task was "for a moment" anyway.

**06** `--click "Table" --click "Full graph"` -- Tried the "Full graph" button at the top thinking it
was about what's counted. It jumped me to a Data page: Summary 77 nodes, 254 edges, and under
Filters: "Filters change what is computed; the eye in the Graph tree only hides." That's actually
the sentence I needed. So hiding = the eye, filtering = changes numbers. Good to know, buried though.

**07** `--click "Table" --click "Thenardier"` -- Clicked Thenardier in the table. Selection 1, the
node gets a ring on the map, a little floating bar of icons appears, "Thenardier, 16 connections".

**08** `--click "Table" --click "Thenardier" --click "Javert" --click "Marius"` -- Tried to pick three.
Selection still says 1 -- it's just Marius now. Each click replaces the last. No checkbox column,
nothing says "shift-click to add". In Excel I'd ctrl-click. I don't see how to get three.

**09** `--click "Table" --click "Thenardier" --hover "Hide"` -- The crossed-out eye in the floating bar
is "Hide on canvas, Ctrl+Shift+H". OK, one at a time then.

**10** `--click "Table" --click "Thenardier" --click "Hide on canvas"` -- Uh. The toast says
"Valjean hidden on canvas". The right panel now says Valjean. I picked THENARDIER. It hid Valjean --
the main character, the biggest node in the whole thing. If this were my customer list and it hid
the wrong account, I'm done trusting it. On the plus side, the table still says 77 nodes and
Valjean still shows degree 36, PageRank 0.0754, and the left list says "1 node hidden on canvas.
Select, Show". So the "counts still include them" part does seem to hold for one node.

**11** `--click "Table" --click "Thenardier" --click "Hide on canvas" --click "Javert" --click
"Hide on canvas" --click "Marius" --click "Hide on canvas"` -- Tried to keep going one by one.
Screen is identical to the last one: still "Valjean hidden", still "1 node hidden". The other two
clicks did nothing I can see.

**12** `... --click "Select"` -- Clicked "Select" in "1 node hidden on canvas". Tooltip "Selects the
hidden elements". Still one.

**13** `--click "Myriel to Javert"` -- Different idea: that shortest-path row has exactly 3 nodes.
Maybe I can grab those three and hide them. Right panel: "Paints 3 nodes, 2 edges".

**14** `--click "Myriel to Javert" --click "More actions"` -- The menu that opened is for "Community
3", a Louvain group I didn't click, and the Louvain row expanded itself. Menu has "Select members",
"Hide in list", "Keep as set". "Hide in list" -- is that hiding the row or the people? I don't know.

**15** `--click "Myriel to Javert" --click "Select members" --click "Hide on canvas"` -- "nothing on
screen is called Select members" -- so that menu was for the other row only. Nothing hidden.

**16** `--click "Myriel" --click "Hide on canvas"` -- Clicked Myriel on the map. It selected the
path row again, no hide button. 

I'm stopping here. I've spent way past my two minutes.

## Outcome

- Do I think I succeeded? Half. I got PageRank on its own (with a hidden shortcut, and it switched
  itself off when I opened the table). I could not hide three characters: I could only ever pick
  one at a time, the one I picked was not the one that got hidden, and the second and third hides
  did nothing. For the one node that was hidden, the numbers did stay the same (77 nodes, Valjean
  still degree 36, columns labeled "(full graph)"), which is the right behavior.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? Not on this evidence. The "(full graph)" column
  labels and the line "Filters change what is computed; the eye only hides" are exactly the
  reassurance I never get from Brandwatch, where the dashboard and the download don't match. But
  it hid the wrong person, and I couldn't select more than one row. Gephi lets me ctrl-click. And
  honestly, the bigger problem is the hide button hid Valjean when I clicked Thenardier -- if it
  does that with a customer list I'd be the one explaining it to my VP. Also nobody tells me the
  Instagram data is missing either, but that's a different rant.

## Problems seen

1. Hiding acted on a different character than the one selected (picked Thenardier; toast and
   inspector said Valjean hidden). Severity: critical for trust.
2. No way to select more than one row or node; each click replaces the selection. Severity: high,
   it blocks the task.
3. Repeat "Hide on canvas" after the first hide did nothing visible. Severity: high.
4. "Show only this row" lives only as Alt-click / Alt+Space in the hide button's tooltip; a plain
   click hides the very thing you want to see. Severity: medium.
5. Solo mode silently ended when the table opened. Severity: medium.
6. Soloing a row that already covers everything changes nothing on the map and shows no
   "showing only" indicator. Severity: low.
7. The row "More actions" menu opened for a different row (Community 3) than the one selected.
   Severity: medium.
8. The explanation of hide vs filter is only on the Data page under Filters. Severity: low.

## What worked

- Column headers saying "(full graph)" and the table holding at 77 nodes with unchanged values after
  a hide.
- "1 node hidden on canvas. Select, Show" in the list, and an Undo on the toast.
