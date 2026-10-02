# Session: weight the door-swipe data on import -- supply chain analyst (Dana)

Task as given: "In the door-swipe data, a person who went into a building 40 times should be
treated as more tightly tied to it than someone who went in once, in every later analysis. Also,
taller buildings matter more. Set that up as you bring the data in."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t20--supply-chain-analyst/.

## Step 1 -- start screen (shots/tasks/t20/01.png)

Import screen, "entries" table open. Think-aloud: "Okay, three tables, people, buildings,
entries. 4,212 rows of swipes. Top right it says 'Weight: none (each edge counts 1)'. That is
exactly my problem -- right now 40 swipes is 40 separate lines, not one heavy one. Let me click
that."

## Step 2 -- click the weight text

    timeout 120 node app-b/study.mjs --try .../02.png task:t20 --click "Weight: none (each edge counts 1)"

Nothing changed. "Huh. It looks like a setting but it's just a label. Fine. What's next to it --
'One edge per: Row / Pair'. Row is one line per swipe. Pair would be one line per person and
building, like a pivot. That's what I want."

## Step 3 -- click Pair

    timeout 120 node app-b/study.mjs --try .../03.png task:t20 --click "Pair"

New banner: "One row per pair: each is one edge, its count the rows it merged." A "count" column
appeared, already marked "Weight", with "Higher means: Stronger / Farther / Capacity", Stronger
selected. 1001 at B1 = 22. Edges went from 4,180 to 1,306.
"Good, that's a pivot table with a count. Stronger is right -- more swipes, tighter tie. I didn't
have to touch it. 'Farther' and 'Capacity' I'd leave alone, I don't know why I'd want those here.
The swipes with unknown people say 'left out', which matches the report at the bottom. Fine."

## Step 4 -- open the buildings table

    timeout 120 node app-b/study.mjs --try .../04.png task:t20 --click "Pair" --click "buildings"

Columns bldg (Key), site (Name), floors (Weight, already). B9 has no floors: "No floors value:
its weight reads 1", with a 1 / 0 toggle in the report.
"Floors is how tall, and it already guessed floors as the weight. Nice, but I'd want to know it
guessed -- it just says Weight, it doesn't say 'we picked this for you'. B9 has no height. 1 or
0? Zero would make it count for nothing, that's worse. Leave 1, and I'd email facilities about
B9."

## Step 5 -- back to entries to make sure Pair stuck

    timeout 120 node app-b/study.mjs --try .../05.png task:t20 --click "Pair" --click "buildings" --click "entries"

Still Pair, still count as Weight. "Good, it remembered when I switched tabs."

## Step 6 -- Load

    timeout 120 node app-b/study.mjs --try .../06.png task:t20 --click "Pair" --click "buildings" --click "entries" --click "Load"

"Reading 3 tables -- 421 nodes, 1,306 edges." "1,306, same as the pair count. So the merge went
through. Done."

## Outcome

- Succeeded, I think. Swipe counts are the weight on each person-building line (higher =
  stronger), and floors is the weight on each building. What I did not check is that a later
  analysis actually uses those weights -- the task says "in every later analysis" and nothing on
  the load screen promised that. I'm trusting the word "Weight".
- Single Ease Question: 6 of 7. Three clicks of real work. Lost a point for the "Weight: none"
  text that looks clickable and isn't, and for not knowing whether the app had guessed floors or
  whether the file said so.
- Would I use it instead of my current tool? For this part, it beats what I do now: in Excel I'd
  pivot the swipes myself, then rejoin the building table, and Power BI would need a measure.
  Here it was a toggle. But it's still a side tool until I know (a) IT is fine with it -- "Local
  only" in the top bar is a good sign, if it means nothing leaves my laptop -- and (b) I can get
  the weighted table back out into Power BI.

## Problems noticed

1. "Weight: none (each edge counts 1)" on the entries row reads like a control; clicking it does
   nothing. The actual way to get a weight is "One edge per: Pair", which I only found because I
   think in pivots. Someone who doesn't would be stuck.
2. floors was pre-set as Weight with no sign it was a guess. Here it was right; if it had picked
   the wrong number column I wouldn't have noticed.
3. Nothing confirms the weights will be used by later analyses ("every later analysis").
4. "Farther" and "Capacity" next to Stronger are unexplained; I ignored them.
5. Small gray text throughout (the "derived" tags, "Higher means", the B9 warning) is hard to read
   on my laptop.
