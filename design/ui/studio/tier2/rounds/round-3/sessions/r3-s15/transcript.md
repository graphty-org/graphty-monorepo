# Session r3-s15 transcript (Analyst Alex, returning user)

Task: in bus-stops.csv (already open), without removing any stop or link, point out on the drawing every link that takes 10 minutes or more, and say how many there are.

`<session>` below is tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s15 (copied here at the end). Every command ran as `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs ...`.

## Step 01 -- start

    node design/ui/studio/tool/real.mjs --start <session> setup:bus-stops-ranked.txt

Sees: bus-stops open, 10 stops colored and sized by PageRank, legend top left, PageRank run selected on the right with the Style tab. Links all gray arrows, no labels. Plan: the left panel has "Find nodes, edges, values" -- try typing the condition there.

## Step 02 -- type the condition in the find box

    node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "minutes >= 10"

Sees: a hint "Start with = to select by a value:" and a suggestion row "=minutes >= `10` -- Select its matches". Plan: click that suggestion.

## Step 03 -- select the matches

    node design/ui/studio/tool/real.mjs --step <session> --click "Select its matches"

Sees: "3 edges selected". Three links drawn thick blue on the canvas. Right panel lists them with minutes: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. Good, but I want to be sure a link of exactly 10 was not left out (>= vs >). Plan: look at the Data view.

## Step 04 -- Data view

    node design/ui/studio/tool/real.mjs --step <session> --click "Data"

Sees: source bus-stops.csv, 10 nodes, 17 edges (matches the file). Attributes: Nodes > id, Edges > minutes. Selection still shows 3 edges. Plan: click "minutes" to see its values.

## Step 05 -- minutes attribute summary

    node design/ui/studio/tool/real.mjs --step <session> --click "minutes"

Sees: minutes is an Amount on Edges, from the file, 100% have a value, 10 distinct values, range 2 to 15. No list of the values, so I still cannot tell if any link is exactly 10. Plan: back to Graph, Everything, Values tab.

## Step 06 -- Everything, Values

    node design/ui/studio/tool/real.mjs --step <session> --click "Graph" --click "Everything" --click "Values"

Sees: only "Covers every node and edge: 10 nodes, 17 edges." No table of links. Plan: type "minutes == 10" in the find box.

## Step 07 -- type an exact-10 query

    node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "minutes == 10"

Sees: suggestion "=minutes == `10` -- Select its matches". Plan: click it (this will replace my selection; I can redo it).

## Step 08 -- exact 10

    node design/ui/studio/tool/real.mjs --step <session> --click "Select its matches"

Sees: "Nothing matches this rule". No link is exactly 10, so the 3 from before are all of them. My earlier highlight is gone. Right panel shows the Graph overview: 10 nodes, 17 edges, directed, 1 component. Plan: clear and redo "minutes >= 10".

## Step 09 -- clear the find box

    node design/ui/studio/tool/real.mjs --step <session> --click "Clear search"

Sees: empty find box, nothing highlighted. Plan: type "minutes >= 10" again and select the matches.

## Step 10 -- reselect >= 10

    node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "minutes >= 10" --click "Select its matches"

Sees: "3 edges selected", the same three links thick blue, list School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. All other stops and links still drawn. Worry: a selection vanishes as soon as anyone clicks. Plan: the selection's Style tab, to make it stick.

## Step 11 -- selection Style tab

    node design/ui/studio/tool/real.mjs --step <session> --click "role=tab:Style"

Sees: Style tab of "3 edges selected" with Line, Arrows and Label rows, each with a plus. Plan: plus next to Line.

## Step 12 -- Add to Line

    node design/ui/studio/tool/real.mjs --step <session> --click-at 1419,136     (button "Add to Line")

Sees: menu Color, Width, Opacity, Pattern, Curved. Plan: Color.

## Step 13 -- Color

    node design/ui/studio/tool/real.mjs --step <session> --click "Color"

Sees: a new row in the left list, "minutes >= `10`" (a layer); its panel shows Line > Color 000000 at 100%. The legend now has "Edge color: minutes >= `10`" with a black swatch. The three links are black under the blue selection. Black vs the gray of the other links is a bit subtle. Plan: add Width.

## Step 14 -- add Width

    node design/ui/studio/tool/real.mjs --step <session> --click "Add to Line" --click "Width"

Sees: Width 24. The blue selection band around the three links became very wide; the black line inside still looks thin. Can't tell what is the layer and what is the selection. Plan: click empty canvas to drop the selection.

## Step 15 -- drop the selection

    node design/ui/studio/tool/real.mjs --step <session> --click-at 1050,300     (empty canvas)

Sees: selection gone. The three links School -> Harbor, Depot -> Station, Station -> Harbor stay thick black; the other 14 links stay thin gray; all 10 stops and 17 links still on the drawing. Legend: "Edge color: minutes >= `10`" with a black swatch. The layer row stays in the left list. Done.

## End

    node design/ui/studio/tool/real.mjs --end <session>

Session ended normally; no further request.

## In my own words (Alex)

**Did I finish?** Yes. There are 3 links of 10 minutes or more: School -> Harbor (12), Depot -> Station (15) and Station -> Harbor (14). They are drawn thick and black on the map, every stop and link is still there, and the legend says black means "minutes >= 10". All three sit in the top part of the map, around the big hub stop; the bottom half has none.

**Ease: 6 of 7.** Typing the condition in the find box and getting "Select its matches" was quick, and the list with the actual minutes next to each link is exactly what I would paste in an email.

**What took longest / confused me:**
- Checking that nothing at exactly 10 got dropped. The minutes attribute shows a range (2 to 15) and "10 distinct values" but not the values, and Everything's Values has no table of links, so I had to run a second "== 10" search. That search threw away my first selection, and I had to type the first one again.
- The search wants backticks around the number (it rewrote mine to `10`) -- fine, but the layer and the legend now say "minutes >= `10`" with the backticks, which looks like code in front of a colleague. I would rather it read "minutes 10 or more".
- Turning the selection into something that sticks: I found it on the Selection's Style tab (Line > Color), which silently turned into a layer. Good outcome, but I did not know that was going to happen until it did.
- Adding Width jumped straight to 24 and the blue selection band ballooned around it, so I could not tell what my styling looked like until I clicked off. Black on gray was the default color; it works, but I'd have picked something louder if it had asked.
