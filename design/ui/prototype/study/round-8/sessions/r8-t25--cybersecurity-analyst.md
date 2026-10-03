# Session: weight the badge-swipe data before loading -- Priya (threat hunter)

Task as given: "The badge-swipe spreadsheets are open on the import page (example data if you do
not work with building access). In every analysis from now on, a person and a building that
appear together many times should count as more tightly tied than a pair seen once, and a taller
building should count for more than a small one. Set that up before you load, then check it took."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25--cybersecurity-analyst/.

## 01 -- start screen (shots/tasks/r8-t25/01.png)

"Example data, fine -- I'm not putting our real badge logs in anything that isn't on the list.
'Local only' up top, good, that's my first question answered. The table is entries.csv: person_id,
building_id, time. Header line says 4,180 edges from 4,212 rows, and the match report tells me
which 32 rows got dropped and why. I like that, it isn't silently eating rows.

What I want is 'more swipes for a pair means a stronger tie'. Right now: 'One edge per: Row | Pair'
and 'Weight: none (each edge counts 1)'. So each swipe is its own edge. If I collapse to one edge
per pair, the obvious weight is the number of swipes. Clicking Pair."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/02.png task:r8-t25 --click "Pair"

## 02 -- one edge per pair

"That did exactly what I expected. 1,306 edges now. A new derived 'count' column, already marked
Weight, 'Higher means: Stronger' selected. 1001 to B1 is 22 swipes, 1002 to B7 is 9. Time became
'earliest and latest', so I didn't lose the time range, which I would have been annoyed about. The
toast says the same thing in one sentence and has Undo. That's half the job.

Now the building size. That has to be on the buildings table. Clicking buildings."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/03.png task:r8-t25 --click "Pair" --click "buildings"

## 03 -- buildings table

"bldg, site, floors. floors is already tagged Weight -- it guessed that, and it guessed right.
Floors is a fair stand-in for 'taller'. B9 has no floors value and it tells me its weight reads 1,
with a 1/0 choice. 1 is the least bad -- 0 would make the building count for nothing. Leaving it.
I'd want to know where that guess came from though; if it had guessed a wrong column I might not
have opened this table at all. Nothing else to set. Load."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/04.png task:r8-t25 --click "Pair" --click "buildings" --click "Load"

## 04 -- loaded

"Hairball, as usual, don't care. Right side Summary: 420 nodes, 411 person, 9 building, 1,306
edges -- matches the import header. 'Weight: count, stronger'. 'Node weight: floors (building)'.
That's the check, in plain sight. 'Nothing is colored or sized by a row' in the corner -- not sure
what that's telling me, ignoring it.

But 'every analysis from now on' -- a summary line is not the same as the analysis using it. Let me
click the weight link and then actually open an analysis."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/05.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "count, stronger"
    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/06.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze"

## 05 -- weight link

"The link drops me back into the import editor ('Edit: entries'), Pair still on, count still
Weight, Apply grayed out because nothing changed. OK, so it stuck. I half expected a definition,
not the editor, but fine."

## 06 -- Analyze list

"Louvain, PageRank, shortest path ('fewest steps, or the lightest route'). And then 'Total count
in and out -- the sum of count over each node's edges'. So it knows count is a number on edges.
Opening PageRank, that's the one my lead will ask about."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--cybersecurity-analyst/07.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze" --click "PageRank"

## 07 -- PageRank form

"Weight: 'count (loaded weight)'. Higher means: Stronger. 'Loaded weight: count, stronger.' Node
weight: 'floors (building, loaded)' -- 'each building weighs its floors; each person weighs 1'.
That's exactly what I asked for, and it's preset, and it tells me where it came from. That's
'it took'. I'm not running it; the task was to set it up and check.

Gripe: Direction defaults to Follow on a person-to-building graph. Person -> building direction
in PageRank means buildings soak up all the rank. Not my task, but I'd have picked undirected for
swipes and I didn't see that choice until the import footer, which I ignored."

## Wrap-up

- Succeeded? Yes. One edge per pair with swipe count as a 'stronger' weight, floors as the building
  weight, confirmed in the Summary and preset in an analysis form.
- Single Ease Question: 6 of 7. Took four clicks. Lost a point because 'Pair' sits in a row of
  small text toggles I only read because I was hunting for 'weight', and because the floors weight
  was guessed for me -- if it had guessed wrong I wouldn't have checked that table.
- Would I use it instead of my current tool? For this kind of entity-pair weighting, maybe. In
  pandas this is a groupby and a merge, three lines, and I can see the code. Here I got the same
  thing with a visible count of what got dropped and a form that tells me which weight an analysis
  uses -- that last bit my notebook doesn't do for me. I'd still want the query or the steps
  exported so I can rerun on next month's file before I'd switch.
