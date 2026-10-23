# Session r2-s09 -- Ruth (returning reporter), task T22 prompt A (bus stops)

Build: 8f0d5a6f7791 (from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`).
Start: setup `bus-stops-ranked.txt`.

Commands run from `design/ui/studio/tier2` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/` and `S=rounds/round-2/sessions/r2-s09`.

## Start

`node ../tool/real.mjs --start $S setup:bus-stops-ranked.txt` -> 01.png

What I see: the bus-stops map, ten round dots in orange shades, sizes by PageRank (the key says so).
No stop names on the dots. Left side: "Find nodes, edges, values" box, then Selection, PageRank (10),
Everything. Right side: the PageRank run's Style. The lines all look the same gray. I need the links
of 10 minutes or more to stand out, and a count. The find box is where I always start. It says it
finds "edges" and "values", so I will try asking it for the minutes.

## Step 1

`--click "Find nodes, edges, values" --type "minutes"` -> 02.png

Result: "No match for "minutes"". So the box does not know the column by its name. It says it finds
values, so maybe it wants the number itself. I will try "10".

## Step 2

`--key Control+a --type "10"` -> 03.png

Result: no list of matches, but a hint under the box: "Start with = to select by a value:" and an
example `` =`10` `` in code type, with backquotes around the 10. So there is a way to pick things by a
value. The example only says "equal to 10", and I do not know what the backquotes are for. I want
10 or more of the minutes column, so I will write it the way I would in a spreadsheet filter, after
the = it asks for: `=minutes >= 10`.

## Step 3

`--key Control+a --type "=minutes >= 10"` -> 04.png

Result: red text, "Put numbers in backticks:" and the corrected rule, ``minutes >= `10` ``. At least it
told me exactly what it wanted, and it seems to know "minutes" now. Odd demand -- no spreadsheet
makes me fence a number in backquotes -- but I will type what it shows me.

## Step 4

``--key Control+a --type '=minutes >= `10`'`` -> 05.png

Result: "Rule: press Enter to select matches". Accepted. It does not say how many match before I
press Enter. I press Enter.

## Step 5

`--key Enter` -> 06.png

Result: "3 edges selected" under the box; Selection in the list now says 3; three lines on the map are
thick blue, the rest stay gray, and every stop and line is still on the drawing. The right side
lists them by name with their minutes: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14.
Names, not just dots -- good. But "Is that all of them?" I want to see every link's minutes once to
be sure nothing at exactly 10 was missed. The Data place on the left is where the sheet lives.

## Step 6

`--click "Data"` -> 07.png

Result: bus-stops.csv, 10 nodes, 17 edges -- matches my colleague's sheet. Under Attributes, Edges has
"minutes". The selection stays (3, still blue). I want to see the spread of minutes; I will click
"minutes".

## Step 7

`--click "minutes"` -> 08.png

Result: a summary of the column -- Edges, Amount, from the file, 100% have a value, 10 distinct values,
range 2 to 15. Useful, but no row-by-row list, so I still cannot read all 17 numbers here. The blue
links are still on the map. My cross-check: ask for the opposite, under 10. If that gives 14, then
3 + 14 = 17 and nothing is lost. Back to Graph and the find box.

## Step 8

`--click "Graph" --click "Find nodes, edges, values" --key Control+a --type '=minutes < `10`' --key Enter` -> 09.png

Result: "14 edges selected", each listed by name with its minutes, highest 9 (Depot -> School). So
3 + 14 = 17, the whole sheet, and no link sits at exactly 10. The count of 3 holds. Now I put the
10-or-more rule back so those three are the ones standing out when my colleague looks.

## Step 9

`--click "Find nodes, edges, values" --key Control+a --type '=minutes >= `10`' --key Enter` -> 10.png

Result: back to "3 edges selected": School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14,
drawn thick blue among the gray links, every stop and link still on the map. That is what my
colleague asked for. I am done.

`node ../tool/real.mjs --end $S`

## At the end, in Ruth's words

**Did I finish?** Yes. Three links take 10 minutes or more: School -> Harbor (12), Depot -> Station
(15) and Station -> Harbor (14). They are drawn thick and blue; nothing was taken off the map. I
checked the count: the opposite rule, under 10, picked the other 14, and 3 + 14 is the 17 links the
Data place says the file has, so none sits at exactly 10 and none is missing.

**Ease: 5 of 7.** Once I was in, it was quick and it showed its working in names and numbers, which is
what I need. The two points off are for getting in.

**What confused me:**

- Typing the column's name, "minutes", found nothing ("No match"), though the box says it finds
  values. I only learned the = trick because I happened to type a bare number next.
- The hint's example, `` =`10` ``, shows only "equal to", with backquotes I had no reason to expect.
  It did not tell me I could name a column or say "10 or more".
- The backquotes around numbers. I wrote it as I would in any spreadsheet and was told off in red.
  The red line did show the exact fix, which saved me, but if it can write the corrected rule for
  me, why make me type it again?
- Before Enter it said only "press Enter to select matches", not how many would match.
- The column summary in Data gave the range (2 to 15) but no list of every link with its minutes, so
  I had to run a second rule to prove nothing was missed.
- I am not sure the blue lasts: it is a "selection", so I suspect one stray click on the map would
  clear it before my colleague sees it. Nothing told me how to keep it.
