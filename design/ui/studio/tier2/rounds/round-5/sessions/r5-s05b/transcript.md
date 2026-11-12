# Session r5-s05b -- transcript

Participant: Nadia, level-1 alert reviewer, returning user.
Task: in bus-stops.csv (already open), point out on the drawing every link that takes 10 minutes or more, without taking anything off the drawing, and say how many there are.

Commands use:
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <session folder> ...`
where the session folder is `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s05b`.

## Step 0 -- 01.png (session already started)

Bus-stops map is open, nodes colored and sized by a "PageRank" thing from earlier. About 11 stops, arrows between them. No minutes shown on the links. Left panel has a find box, "Selection", "PageRank 10", "Everything". I need the links of 10 minutes or more. Normally I would type into the find box first.

## Step 1 -- 02.png
`--click "Find nodes, edges, values"`
Box is focused, nothing pops up. I'll type the column name, "minutes", and see if it knows what that is.

## Step 2 -- 03.png
`--type "minutes"`
It says "Start with = to select by a value" and offers "=minutes, Select its matches". Select is what I want -- not hiding. I'll write the whole condition the way I'd say it: =minutes >= 10.

## Step 3 -- 04.png
`--key Control+a --type "=minutes >= 10"`
Red line: "Put numbers in backticks". Odd -- backticks? But it already offers the fixed version, =minutes >= `10`, "Select its matches". I'll just click that.

## Step 4 -- 05.png
`--click "Select its matches"`
"3 edges selected". Three links are drawn thick blue: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. All the stops and other links are still on the drawing, so nothing was taken off. Before I write "3" down I want to check there isn't a link at exactly 10 it skipped -- QA would ask. I'll open the table view at the bottom and look at the minutes column.

## Step 5 -- 06.png
`--click-at 793,863` (the Table button)
Table opened under the drawing, on Nodes (10 stops). The three blue links are still marked. I want the links, so the Edges tab.

## Step 6 -- 07.png
`--click "Edges"`
17 links, in the order loaded: 4, 6, 5, 9 ... Only four rows show. I'll click the minutes header hoping it sorts, so the big ones come to the top.

## Step 7 -- 08.png
`--click-at 1130,742` (the "minutes" column header)
"Sorted by minutes, highest first": 15 Depot -> Station, 14 Station -> Harbor, 12 School -> Harbor, all three highlighted, then 9 Depot -> School. Nothing at exactly 10, so three is right. The three links are marked thick blue on the drawing and every stop and link is still there. Done -- ending.

`--end` -- session ended cleanly, no further request.

## At the end (in character)

**Did I finish?** Yes. Three links take 10 minutes or more: Depot -> Station (15), Station -> Harbor (14), School -> Harbor (12). They are marked thick blue on the map and nothing was taken off it.

**Ease: 6 of 7.** Under two minutes, which is inside my one-alert budget. The find box I already use did it once I typed "=".

**What confused me:**
- "Put numbers in backticks" -- I have never typed a backtick at work. It offered the fixed line, so I clicked it, but I would not have known to write it that way myself.
- Whether ">= 10" counts a link of exactly 10. The panel did not say, so I had to open the table and sort to check there was nothing at 10. QA would want that shown.
- It is not obvious whether "selected" survives into a saved picture or the project. I did not test the export this time; for an alert file I would need the blue marking to show in the picture.
