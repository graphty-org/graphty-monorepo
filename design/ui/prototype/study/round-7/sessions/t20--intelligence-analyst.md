# Session: intelligence analyst (Marcus), weight links by swipe count and buildings by height

Task given: "In the door-swipe data, a person who went into a building 40 times should be treated
as more tightly tied to it than someone who went in once, in every later analysis. Also, taller
buildings matter more. Set that up as you bring the data in."

All commands run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t20--intelligence-analyst/.

## Step 1 -- start screen (shots/tasks/t20/01.png)

Import screen for the entries table. First thing I read: "Weight: none (each edge counts 1)".
That's the problem in one line -- right now a guy who badged in 40 times counts the same as a
guy who badged in once. Next to it: "One edge per Row / Pair". Row means 4,180 separate links.
Pair should roll them up to one link per person-building with a count, the way I'd do it with a
pivot table in Excel. Trying Pair.

## Step 2 -- click "Pair"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t20--intelligence-analyst/02.png task:t20 --click "Pair"

Exactly what I'd have done in a pivot. Banner: "One row per pair: each is one edge, its count the
rows it merged." 1,306 links now, not 4,180. A "count" column showed up, marked "derived", already
set as Weight, with "Higher means: Stronger / Farther / Capacity" and Stronger picked. 1001 to B1
is 22. That's the swipe count. Good -- and "Stronger" is the right word, not "Farther". It also
kept earliest and latest time per pair, which I'd want for a timeline anyway.

Small gripe: I didn't pick Weight, it picked it for me. Fine this time because it guessed right,
but I read that twice to make sure it wasn't weighting by something else.

## Step 3 -- click "buildings"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t20--intelligence-analyst/03.png task:t20 --click "Pair" --click "buildings"

No height column. There's "floors". That's height for my purposes. It's already set as Weight,
and the report at the bottom says "floors is each building's node weight". Again done before I
got there.

B9 has no floors value: "its weight reads 1", with a 1 / 0 toggle. I'd leave it at 1 -- 0 would
make the building disappear from anything weighted, and I don't know it's a one-story building, I
just don't know. I'd flag it in my notes. At least it told me instead of quietly guessing.

Unrelated gripe: it took "site" as the Name. Three buildings will all be labelled "North campus".
On a chart that's useless; I'd want B1, B2. The report even warns about it. Not my task, left it.

## Step 4 -- click "Load"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t20--intelligence-analyst/04.png task:t20 --click "Pair" --click "buildings" --click "Load"

"Reading 3 tables -- 421 nodes, 1,306 edges". 412 people plus 9 buildings is 421, and 1,306 is
the paired count I saw. Numbers agree with the import screen, which is what I check first.

It also loaded with the 25 unknown badge holders and the bad B12 rows left out -- that was the
default. For a real case I'd want those 32 rows in front of me; an unknown badge in a building is
exactly the thing I'd be looking for. Not this task, though.

## Wrap-up

Did I succeed? I think so. Links weighted by number of entries, higher = stronger; buildings
weighted by floors. What I can't confirm from this screen is the "every later analysis" part --
whether the path finder and the middleman score actually use these weights. I'd want the
analysis to say "weighted by count" next to its result before I repeat a number to a sergeant.

Single Ease Question: 6 of 7. Three clicks. The only thinking was that "Pair" means "roll up
repeat swipes", and knowing that floors stands in for height.

Would I use this instead of my current tool? For this step, yes over Excel: the rollup from
swipes to a count is the pivot table I'd build by hand, and here it's one toggle that shows me
the count right there. The weights were set before I touched them, which made me nervous enough
to read every label twice -- I want to see what a tool decides for me. I'd still need to see the
weights show up in the analysis output, and I'd want the building labels fixed, before it goes
near a chart for court.
