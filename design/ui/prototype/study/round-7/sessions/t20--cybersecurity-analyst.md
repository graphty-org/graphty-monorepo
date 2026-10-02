# Session: weight door-swipe edges by count and buildings by height, at import

Participant: Priya, threat hunter in a corporate SOC (persona: study/personas/cybersecurity-analyst.md)

Task as given: "In the door-swipe data, a person who went into a building 40 times should be treated as more tightly tied to it than someone who went in once, in every later analysis. Also, taller buildings matter more. Set that up as you bring the data in. The data on screen is a sample: a company's door swipes, people and buildings. If that is not your line of work, treat it as your own records of who touched what."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t20--cybersecurity-analyst/.

## Start screen (shots/tasks/t20/01.png)

"Before anything: top bar says 'Local only'. Fine, I'll take that at face value for a study -- in real life I'd want to know what that means, but it's the right first thing to tell me.

It's an import screen. Three tables: people 412, buildings 9, entries 4,212. Entries is set as an edge, person to building, 'One edge per Row', and on the right 'Weight: none (each edge counts 1)'. That's exactly the thing I need to change. 4,212 swipes, one edge per swipe -- so a guy who badged in 40 times is 40 parallel edges. I don't want that. I want one edge per person-building with a count. That's a stats count by person_id, building_id in SPL.

'One edge per: Row | Pair'. Pair is my group-by. Click it."

Also noticed: match report says 25 person_ids not in people and 7 building_ids not in buildings, defaulting to 'Leave out'. Good that it tells me, not silently dropped. B12 is a building that doesn't exist -- in a real badge log that's the first thing I'd chase, not noise.

## Step 1: Pair

    timeout 120 node app-b/study.mjs --try .../01.png task:t20 --click "Pair"

"There we go. Blue line: 'One row per pair: each is one edge, its count the rows it merged.' Header now reads 1,306 edges from 4,180 of 4,212 rows. It added a derived 'count' column and already marked it 'Weight', 'Higher means: Stronger | Farther | Capacity', Stronger selected. 1001 to B1 is 22. That's the 40-times-versus-once thing done, and it picked 'Stronger' without me asking, which is right for this. It also kept earliest and latest time instead of throwing time away -- 'Combine: Earliest and latest'. I like that; first-seen/last-seen is what I'd compute anyway.

4,180 entries became 1,306 edges. 4,212 minus 32 left out = 4,180. Counts add up. Good."

Minor gripe: 'Farther' and 'Capacity' next to 'Stronger' -- I get Stronger. Capacity I'd have to think about. Didn't need to.

## Step 2: buildings table

    timeout 120 node app-b/study.mjs --try .../02.png task:t20 --click "Pair" --click "buildings"

"Buildings: bldg is Key, site is Name, floors is already tagged 'Weight'. Report: 'floors is each building's node weight.' So 'taller' = floors, and it's already the node weight. I didn't have to do anything. Slightly suspicious when a tool guesses right for me -- but it shows the guess, so I can check it, and it's right.

B9 has no floors value: 'its weight reads 1', with a 1 / 0 toggle. I'd rather it be blank than made up, but 1 is the least-wrong default -- 0 would make the building vanish from anything weighted. Leaving it at 1. I'd note B9 in my case notes as unknown height.

Other thing: site as the Name means three labels repeat across nine buildings ('North campus' three times). It warns me. I'd rather see B1 than 'North campus' on a node, but not my task."

## Step 3: back to entries to make sure Pair stuck

    timeout 120 node app-b/study.mjs --try .../03.png task:t20 --click "Pair" --click "buildings" --click "entries"

"Still Pair, still 1,306 edges, still count as Weight. Didn't reset when I switched tables. Good."

## Step 4: Load

    timeout 120 node app-b/study.mjs --try .../04.png task:t20 --click "Pair" --click "buildings" --click "Load"

"'Reading 3 tables -- 421 nodes, 1,306 edges', progress bar, Cancel. 412 people + 9 buildings = 421. Edge count matches what the import told me. It's showing me it's working, so I'm not wondering if it hung.

Done, as far as I can tell."

## Verdict

Succeeded? I think so. Edges are one per person-building pair with the swipe count as weight, higher = stronger; buildings carry floors as their node weight. What I can't verify from here is the 'in every later analysis' part -- nothing tells me centrality or communities will actually use those weights rather than ignoring them. I'd check that the first time I run something, and if the result looks unweighted I'd stop trusting it.

Single Ease Question: 6 of 7. Two clicks plus a check. Lost a point because I can't confirm downstream use of the weights, and the 'Farther / Capacity' wording made me pause.

Would I use this instead of my current tool? For this kind of prep, maybe. In my notebook this is a groupby-count and a merge, five lines of pandas, and I'd keep it there because it's recorded and reproducible. What this has over pandas is the match report -- the 32 orphan rows, B12, the leading-zero keys -- laid out without me writing the checks. If I could save this import setup and rerun it on next month's export, I'd consider it. Nothing here showed me that I can.
