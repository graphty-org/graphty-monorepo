# Session: door swipes, one link per person and building, then each swipe on its own

Participant: Priya, threat hunter in a bank SOC (persona file study/personas/cybersecurity-analyst.md)

Task as given: "You are bringing in the door swipes, and as things stand every single swipe would be
drawn as its own line between a person and a building, which will make a mess. Change it so each
person is linked to each building once, with how often they went in kept on that link. Then try
making each swipe something you can click on by itself, and see what that does to the picture."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t19--cybersecurity-analyst/.

## Step 0 -- start screen (shots/tasks/t19/01.png)

"OK, an import screen. 'Local only' at the top -- good, that is the first thing I want to know,
though I would want to click it and see what it actually promises. The 'Makes' line in monospace is
nice: person (412) --entries (4,180 edges from 4,212 rows)--> building (9). That reads like a
schema, I can check it.

Row of choices: 'Each row is a node / an edge', 'One edge per Row / Pair', 'Weight: none (each edge
counts 1)'. So 'One edge per Pair' is the thing. That's literally a group-by person_id, building_id.
I'd do that in SPL with stats count by. Let's click it."

The match report already bothers me: 25 badge numbers not in people, 7 building ids not in
buildings, and the default on both is 'Leave out'. For a door-access hunt, badge 7 and badge 1530
swiping into B4 and B2 with no person on file are exactly the swipes I'd want to look at. Leaving
them out by default is the wrong default for my job -- although at least it tells me, with a count,
instead of dropping them silently.

## Step 1 -- one edge per pair

Command:

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--cybersecurity-analyst/01.png task:t19 --click "Pair"

Render: 01.png

"There it is. 'One row per pair: each is one edge, its count the rows it merged.' Makes line now
says 1,306 edges from 4,180 of 4,212 rows. Bottom line: 4,180 entries became 1,306 person-building
edges. The numbers add up with the first screen.

It added two derived columns: 'time (latest)' and 'count', and count is already set as Weight,
'Higher means Stronger'. The time column became 'time (earliest)' with a 'Combine: Earliest and
latest' picker. That's good -- I did not ask for it but I would have been annoyed if the time had
just vanished. First and last swipe per pair is the thing I'd actually look at. 1001 into B1:
22 times, 03-02 07:58 to 03-27 17:12. Plausible.

'left out' in the count column for the orphan badges, consistent with the report.

'Higher means Stronger / Farther / Capacity' -- I get Stronger. Farther and Capacity I'd skip; that
is graph-theory talk, not mine. Defaulting to Stronger is right for swipe counts.

That's part one done, one click. I'd have expected the weight line I saw on the first screen
('Weight: none') to be where I pick count, but it did it for me."

## Step 2 -- each swipe as its own clickable thing

"Click on by itself... a line can't really hold a timestamp I can click and annotate in most tools,
so I guess they mean make the swipe a node. 'Each row is: a node'. Try that."

Command:

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--cybersecurity-analyst/02.png task:t19 --click "Pair" --click "a node"

Render: 02.png

"Makes line: person (412) <--person_id-- entry (4,212) --building_id--> building (9). So every swipe
becomes a node in the middle with a link to the person and a link to the building. Type 'entry',
'Key: row number (no Key column)'. The Pair option disappeared, which makes sense -- you can't
group and keep every row at the same time. Columns now say 'Links to -> person' and 'Links to ->
building'.

Interesting: in this mode the unknown badges are kept as nodes and only the link is left out
('Leave out the link'), so badge 7's swipe still exists as an entry. That's actually what I wanted
for the unknown badges. But it means two different defaults for the same problem depending on mode,
and I only noticed because I read the button.

The row-number key warning: 'Notes on entries may move if the row order changes.' That one matters
to me -- if I annotate a swipe and re-import next month's file, my note lands on a different swipe.
I'd want to key on a swipe id from the badge system. There's no such column in this sample, so fine,
but it's a real trap.

What does it do to the picture? From the counts, it goes from about 1,300 lines to 4,212 extra dots
and twice as many lines. Let's load and see."

## Step 3 -- load

Command:

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--cybersecurity-analyst/03.png task:t19 --click "Pair" --click "a node" --click "Load"

Render: 03.png

"'Reading 3 tables -- people.csv, buildings.csv, entries.csv: 4,633 nodes, 8,392 edges...' with a
progress bar and Cancel. 412 + 9 + 4,212 = 4,633. 4,212 times 2 = 8,424, minus the 32 dead links =
8,392. The counts add up, which is the first thing I check. And it shows progress, so I don't think
it hung.

So the answer to 'what does it do to the picture': 4,633 nodes instead of 421, 8,392 lines instead of
1,306. It's the hairball I was warned about, just with dots in the middle of each line. I never got
to see the picture itself on this screen -- it was still reading -- so I'm judging from the numbers.
That's enough for me: I would not do this for the whole month. I'd do it for one person or one
building after I'd already found something in the pair view.

What I didn't find: a way to do both -- pairs for the overview, individual swipes only when I pivot
into one person-building link. That's what I actually want. And honestly, the per-swipe view is a
timeline, not a graph: badge 1001, B1, 22 times, in time order. I'd ask for that before 4,212 dots."

## Outcome

- Succeeded? Yes for part one (one link per person and building, with a swipe count as its weight,
  and first and last time kept). Yes for part two in the sense that I found how to make each swipe
  its own thing and saw what it does in numbers; I did not see the rendered picture because it was
  still loading.
- Single Ease Question: 6 of 7. Two clicks for the main job, the counts reconcile every step.
  Lost a point on the inconsistent handling of unknown badges between the two modes and on not
  seeing the actual picture.
- Would I use this instead of my current tool? For this specific job, building a person-to-building
  graph from a swipe export, maybe -- it beats writing a stats-count-by and then a converter. It
  does not replace Splunk. Before a real trial I need 'Local only' to explain itself, a stable key
  for notes, and a way to see a link's individual swipes in time order without turning the whole
  month into nodes.

## Notable observations

- 'One edge per: Row / Pair' was found immediately; the 'Makes' line and the closing sentence
  ('4,180 entries became 1,306 person-building edges') confirmed the result without loading.
- Pair mode quietly made count the weight and kept earliest and latest time -- welcome.
- Unknown badges: dropped with 'Leave out' by default in edge mode, kept as nodes in node mode.
  For security work the unknown badges are the most interesting rows.
- 'Higher means Stronger / Farther / Capacity' is jargon to me; I'd leave it alone.
- Row-number keys mean notes on swipes can move on re-import; said on screen, which I appreciate.
- No way found to keep pairs for the overview and drill into one pair's swipes.
