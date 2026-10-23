# Session r4-s09 -- Ruth, returning (bus links of 10 minutes or more)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s09
Build: .study-builds/tier2-r4d1-5277e2cbe (commit 5277e2cbe)

## Start

    REAL_DIST=.../tier2-r4d1-5277e2cbe/ node real.mjs --start <session> setup:bus-stops-ranked.txt

01.png: bus-stops is open. 10 stops drawn as orange balls sized and colored by a PageRank run (left panel: "PageRank 10"). Legend top left: Size and Color by PageRank. Right panel shows the PageRank run, Style tab. No labels on the stops, no minutes visible anywhere. I need the links of 10 minutes or more, marked on the drawing, and a count.

## Step 1 -- type "minutes" in the find box

    real.mjs --step <session> --click "Find nodes, edges, values" --type "minutes"

02.png: the box offers "Start with = to select by a value:" and a suggestion "=minutes  Select its matches". No match list for the plain word. So the box can select by a value. I'll try writing the rule myself: "=minutes >= 10".

## Step 2 -- type the rule "=minutes >= 10"

    real.mjs --step <session> --key Control+a --type "=minutes >= 10"

03.png: red hint "Put numbers in backticks:" and it offers a corrected rule "=minutes >= `10`  Select its matches". Odd syntax, but it fixed it for me. I'll click its suggestion.

## Step 3 -- click the suggested rule

    real.mjs --step <session> --click "Select its matches"

04.png: "3 edges selected". Three links drawn thick and blue on the map. Right panel lists them by name with minutes: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. Good: names and numbers. But is that all of them, and did ">=" catch a link of exactly 10? I want to see all 17 links with their minutes. Trying the table button in the toolbar.

## Step 4 -- open the table

    real.mjs --step <session> --hover-at 793,864 --click-at 793,864   (button "Table", tooltip "Table Shift+T")

05.png: a table opens under the map, on the Nodes tab (10 nodes, Id and PageRank). The three blue links are still marked above it. I want the links, so the Edges tab.

## Step 5 -- Edges tab

    real.mjs --step <session> --click "Edges"

06.png: "17 edges" -- that is all 17 links of the sheet. Columns From, To, minutes, "In the order loaded". Only four rows fit. I'll click the minutes header to sort.

## Step 6 -- sort the links by minutes

    real.mjs --step <session> --click-at 1130,742   (button "minutes")

07.png: "Sorted by minutes, highest first". Depot -> Station 15, Station -> Harbor 14, School -> Harbor 12 -- these three rows are shaded as selected -- then Depot -> School 9. So nothing sits at exactly 10, and the next link down is 9. The table, the right-hand list and the three blue lines on the map all say the same three links. Nothing was taken off: the map still has all 10 stops and the table says 17 edges.

Checked one link: Depot -> Station reads 15 in the table and 15 in the side list. Held.

## End

    real.mjs --end <session>

Session ended; no further request.

## In my own words (Ruth)

- **Did I finish?** Yes. Three links take 10 minutes or more: Depot -> Station (15), Station -> Harbor (14), School -> Harbor (12). They are drawn thick and blue on the map, and every stop and link is still there.
- **Ease: 6 of 7.**
- **What confused me:**
  - The find box wanted numbers "in backticks". I would never have guessed that. It did offer the corrected rule, so I only had to click it, but it reads like a programmer's syntax.
  - The blue marking is a selection. One stray click on the map and it is gone. Fine for pointing it out today; if the colleague wants a map that keeps the slow links marked, I don't see how from here.
  - The stops have no names on the map, so on the drawing alone I can't say which blue line is which. The side list and the table gave me the names, and they agreed with the drawing.
  - Opening the table pushed the map up and hid the bottom stop behind the toolbar for a moment. Nothing was lost, but it looked cramped.
- **What saved me a check:** the right-hand list gave each marked link by name with its minutes, and the table's selected rows lined up with it, sorted, so I could see the next one down was 9.
