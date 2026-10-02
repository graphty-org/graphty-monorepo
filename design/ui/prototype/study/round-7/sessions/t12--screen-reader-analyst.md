# Session: path between Fantine and Gavroche -- screen-reader analyst (Morgan)

Task given by the moderator: "Which characters link Fantine to Gavroche through as few others as
possible? Show it in the drawing. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t12/01.png. All renders are in
tmp/round-7-sessions/t12--screen-reader-analyst/. Every command was run from
design/ui/prototype; `$D` below stands for the absolute path of that render folder.

Note on the simulation: Morgan works by screen reader. The renders stand in for what the screen
reader would read out; where only a picture says something (a highlight, a placement), Morgan
counts it as not said.

## Think-aloud

**Start.** Title "Les Miserables". The list on the side reads me a set of rows: Selection, Notes 4,
PageRank, Louvain 6 groups, Shortest paths, then "Valjean to Jav..." 2 and "Myriel to Javert" 3,
Watchlist, a folder "For the report". So somebody already made shortest paths here. Good sign:
the thing I want has a name in the list. Whatever is in the middle -- the drawing -- I'll come
back to. The toolbar at the bottom is icons. I'll need tooltips for those.

**01 -- `--click "Shortest paths"`.** The row goes current. The panel on the right reads me...
"Louvain. Run from Louvain, Sep 28. Paints 77 nodes. Fill: Eight distinct." I picked Shortest
paths and it told me about Louvain. That is the kind of thing that makes me stop trusting a
panel. I can't tell if I'm on the row I think I'm on. Noted.

**03 -- `--click "Valjean to Javert"`.** This one is better. Right panel: "Valjean to Javert.
Path from Shortest paths. Size 2 nodes, 1 edge. From Valjean, To Javert. Edge value 17 shared
chapters. Members, in path order: Valjean start, Javert end. Made with: all at their defaults."
That is exactly the shape of answer I want for Fantine to Gavroche: members in path order, said
as text. Now I need to make one.

**02 -- `--hover "Analyze"`.** The first icon in the bottom toolbar is "Analyze, Shift+A". Fine,
a shortcut, written down.

**04 -- `--click "Analyze"`.** A list opens with a search box, "Search, or say what to find".
Recent: Louvain, PageRank, "Shortest path -- the fewest steps, or the lightest route, between
two nodes". Each entry says what it answers, with the important word first. I like that. Behind
it the right panel now reads the whole graph: 77 nodes, 254 edges, undirected, weight "value,
stronger", 1 connected component. That's the summary I always ask for, and it is just there.

**05 -- `--click "Shortest path"`.** A form, "Path between": From "Type a name", To "Click to
pick", Weight "value (loaded weight)", Stronger / Farther / Capacity, "Shortest path reads a
weight as distance: it uses 1/value", Scope "Whole graph, 77 nodes", and a Find path button,
disabled. There's also a banner at the top: "Click a node or set for From". Click a node. I don't
click nodes. But the field says I can type a name, so I'll type.

Also -- the moderator said "as few others as possible". That's hops. The form is set to use the
chapter counts as a weight, which would give me the lightest route, not the fewest people. It
says so, which I appreciate: it tells me it uses 1/value. I'll have to change that.

**06 -- `--click "From"`.** Clicking the word "From" did nothing I could hear. The label is not
tied to the field, or at least it did not move me into it.

**07 -- `--click "Type a name" --key F --key a --key n`.** Typing goes in: "Fan". A tooltip says
"Click a node on the canvas, or type a name". No list of matching names came up after three
letters. With 77 characters I'd expect suggestions. I'll type the whole name and hope it's
spelled the way the data spells it.

**08 -- full "Fantine", Enter.** From now says "Fantine". The banner changes to "Click a node or
set for To", and the To field now says "Type a name". Did my focus move? I'll find out.

**09 -- type "Gavroche", Enter, `--click "value (loaded weight)"`.** My second attempt to click
"Type a name" for To failed ("nothing on screen is called that") -- but my typing still landed
in To. So focus had moved to To after Enter. This time the focus move helped me; I would still
want it to say it moved. To reads "Gavroche". Find path is enabled now. The weight list opens:
"None", then a heading "edges", then "value" checked. None is what "fewest others" means.

**10 -- `--click "None"`.** Weight: None. Note under it: "This path only. Loaded weight: value,
stronger." OK -- I'm not changing the graph's weight, just this run. Clear enough.

**11 -- `--click "Find path"`.** "Path added. Undo." Then a chip: "1 edge, total value 17". The
right panel: "Valjean to Javert. Size 2 nodes, 1 edge. From Valjean, To Javert. Edge value 17
shared chapters."

That is not my path. I asked for Fantine to Gavroche, unweighted. It told me "path added" and
then read me the Valjean to Javert path that was already there. The total value 17 is Valjean
and Javert's chapter count. The Shortest paths list in the side panel still has two rows:
Valjean to Javert and Myriel to Javert. There's no Fantine row. Either it added nothing, or it
added something and put my focus on a different path. I can't tell which, and the tool is
telling me two contradictory things at once.

**12 -- `--click "Fantine to Gavroche"`.** Nothing on screen is called that. So no row, no
result I can go back to.

**13 -- `--click "1 edge, total value 17"`.** Clicking the result chip does nothing new; the
panel still reads Valjean to Javert.

That's two dead ends in a row -- a result that isn't mine, and no way to find mine. I'm stopping.
I'd do this in NetworkX in one line: `nx.shortest_path(G, "Fantine", "Gavroche")`.

## Commands run

```
timeout 120 node app-b/study.mjs --try $D/01.png task:t12 --click "Shortest paths"
timeout 120 node app-b/study.mjs --try $D/02.png task:t12 --hover "Analyze"
timeout 120 node app-b/study.mjs --try $D/03.png task:t12 --click "Valjean to Javert"
timeout 120 node app-b/study.mjs --try $D/04.png task:t12 --click "Analyze"
timeout 120 node app-b/study.mjs --try $D/05.png task:t12 --click "Analyze" --click "Shortest path"
timeout 120 node app-b/study.mjs --try $D/06.png task:t12 --click "Analyze" --click "Shortest path" --click "From"
timeout 120 node app-b/study.mjs --try $D/07.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name" --key F --key a --key n
timeout 120 node app-b/study.mjs --try $D/08.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name" --key F --key a --key n --key t --key i --key n --key e --key Enter
timeout 120 node app-b/study.mjs --try $D/09.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name" --key F --key a --key n --key t --key i --key n --key e --key Enter --click "Type a name" --key G --key a --key v --key r --key o --key c --key h --key e --key Enter --click "value (loaded weight)"
  -> nothing on screen is called "Type a name" (second time; typing still went into To)
timeout 120 node app-b/study.mjs --try $D/10.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name" --key F --key a --key n --key t --key i --key n --key e --key Enter --key G --key a --key v --key r --key o --key c --key h --key e --key Enter --click "value (loaded weight)" --click "None"
timeout 120 node app-b/study.mjs --try $D/11.png task:t12 (same as 10) --click "Find path"
timeout 120 node app-b/study.mjs --try $D/12.png task:t12 (same as 11) --click "Fantine to Gavroche"
  -> nothing on screen is called "Fantine to Gavroche"
timeout 120 node app-b/study.mjs --try $D/13.png task:t12 (same as 11) --click "1 edge, total value 17"
```

## Outcome

- **Succeeded?** No. I set up the right question -- Fantine to Gavroche, no weight, whole graph
  -- and the tool said "Path added" and then showed me Valjean to Javert. I never got the names
  of the characters in between, and I can't say whether anything was drawn.
- **Single Ease Question:** 2 of 7. Getting to the form was easy and the form was honest about
  the weight. The answer was the wrong one.
- **Would I use this instead of my scripts?** Not for this. NetworkX gives me the path as a list
  in one line, and it's the path I asked for. What I'd take from this tool: the graph summary in
  the right panel (nodes, edges, direction, weight, components, all as text, without running
  anything), and the "members in path order" readout for a path -- if it were reading the path I
  made.

## Problems, in my words

1. After Find path, the result shown is a different path (Valjean to Javert, "1 edge, total
   value 17"), not Fantine to Gavroche. No new row appears under Shortest paths. Severity: task
   failure.
2. Picking the "Shortest paths" row made the right panel describe Louvain. I can't trust where I
   am. Severity: high.
3. Instructions say "Click a node" (banner and tooltip). The type-a-name route works, but the
   first thing said is the one I can't do. Severity: medium.
4. Typing a name gives no matching list; I had to know the exact spelling. Severity: medium.
5. Focus moved from From to To on Enter without being said. It helped me, but it moved on its
   own. Severity: low.
6. Clicking the label "From" does not put me in the field. Severity: low.
7. The form defaults to the loaded weight; "as few others as possible" needs Weight: None. It
   does say "uses 1/value", which is the kind of definition I want, but someone in a hurry gets
   the lightest route, not the fewest people. Severity: medium.

## What worked

- The Analyze list says what each method answers ("the fewest steps, or the lightest route,
  between two nodes").
- The whole-graph summary is in text: 77 nodes, 254 edges, undirected, 1 component.
- An existing path reads as members in path order with start and end marked.
- The weight choice is per run ("This path only") and says how weight is turned into distance.
