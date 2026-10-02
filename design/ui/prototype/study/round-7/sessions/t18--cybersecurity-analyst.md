# Session: three spreadsheets into one picture, and count the swipes that point nowhere

Participant: Priya, threat hunter in a corporate SOC (persona file: study/personas/cybersecurity-analyst.md)

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes point
at a person or a building that is not on those lists."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t18--cybersecurity-analyst/.

## Start screen (shots/tasks/t18/01.png)

Think-aloud: "Okay, before anything: approved, where does it run, does it phone home? Top bar
says 'Local only'. That's the right first answer, but it's a chip, not an explanation. In a real
trial I'd want to click it and see what it means. Moving on, it's a study.

It's already got my three files in a list on the left: people 412, buildings 9, entries 4,212.
Good, row counts up front, that's the first thing I'd check. The gray strip on top reads like a
schema: person (412) --entries (4,180 edges from 4,212 rows)--> building (9). So already I can
see 4,212 rows went in and 4,180 edges come out. That's 32 rows missing. That's probably my
answer, but I'm not trusting a subtraction I did in my head.

People table: id is the key, name is the name. Match report at the bottom says 1 repeated key,
kept the first. Yeah, I can see it, Priya Nair is in there twice, 1188, with two badge numbers.
Kept the first -- fine for this, but in a real case a person with two badges is a lead, not a
duplicate. And id 0007 for Wei Chen. Leading zeros. Watch that."

## Step 1: open the swipe table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/01.png task:t18 --click "entries"

Saw: entries.csv set as 'an edge', person to building, one edge per row. person_id is From ->
person, building_id is To -> building, time column picked up as Time. Bad cells are flagged
inline: '7 Not in people', '1530 Not in people', 'B12 Not in buildings'. Match report:
4,212 rows; 4,180 have both ends; 25 person_id values (25 rows) not in people; 7 building_id
values (7 rows) not in buildings; 'Show the 32 rows'. Each problem has 'Add as people / Leave
out', currently 'Leave out'. Also: 'person_id is Number here and Category in people: matched as
text. 3 keys differ only by leading zeros (not merged).'

Think-aloud: "Okay, this is actually the thing I'd do in pandas, done for me. 25 plus 7 is 32,
and 4,212 minus 4,180 is 32, so the counts add up and no row is in both buckets. I like that it
says 'rows', not just 'values'. It also picked up the time column on its own, which I'd need
later for a timeline.

But look at row three: person 7, 'Not in people'. People has 0007, Wei Chen. That's the same
badge holder with the zeros stripped -- Excel did that to someone's export. And the tool knows:
'3 keys differ only by leading zeros (not merged)'. So at least some of those 25 'unknown
people' are probably not unknown at all. That's exactly the kind of thing that makes a graph
fiction. I want to see those three and, ideally, tell it to treat 7 and 0007 as the same."

## Step 2: the leading-zeros keys

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/02.png task:t18 --click "entries" --click "3 keys"

Saw: a filter strip "Showing the rows whose key differs only by leading zeros: 1 of the 8 sample
rows. Show all rows" and one row, 7 -> B4.

Think-aloud: "One of the eight sample rows. I asked about three keys, I want the three keys and
how many swipes each has. 'Show all rows' just clears the filter. So I know 3 keys are affected
but not how many of the 25 rows they cover. Could be 3 rows, could be 20."

## Step 3: the 32 rows

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/03.png task:t18 --click "entries" --click "Show the 32 rows"

Saw: "Showing the rows with an end not matched: 3 of the 8 sample rows. Show all rows." Three
rows: 7 -> B4, 1530 -> B2, 1214 -> B12.

Think-aloud: "Link says 32 rows, screen shows 3 of 8 sample rows. That's a preview, I get it, but
the link promised me 32. I can't get those 32 out as a list from here. For a real case I need
that list -- the 1530 badge that isn't in HR is the interesting finding, not the picture."

## Step 4: look for a way to fix the zeros

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/04.png task:t18 --click "entries" --click "From -> person"

Saw: a role menu (From ->, To ->, Subtype, Name, Time, Weight (disabled), Edge id, Position,
Attribute). Nothing about type, text or leading zeros.

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/05.png task:t18 --click "entries" --click "#"

Saw: nothing changed. The '#' next to person_id is not a control.

Think-aloud: "It tells me the column is Number here and Category over there, and shows me a '#',
and the '#' does nothing. So it diagnosed the problem and gave me no lever. Fine -- I'd fix it in
the CSV and reload. Annoying, but it's what I'd do anyway. Ninety seconds on that, done."

## Step 5: load it

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/06.png task:t18 --click "entries" --click "Load"

Saw: the graph view with a progress card "Reading 3 tables -- people.csv, buildings.csv,
entries.csv: 421 nodes, 4,180 edges..." with a progress bar and Cancel. Left panel: Selection,
Notes, Everything; "Analyze (Shift+A) to add results here".

Think-aloud: "421 nodes is 412 people plus 9 buildings, 4,180 edges is what it promised. So
'Leave out' really left them out, and it didn't invent 25 ghost people. Good. And it shows me
it's working, with a bar and a cancel, which is more than BloodHound ever did."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t18--cybersecurity-analyst/07.png task:t18 --click "entries" --click "Load" --click "Everything"

Saw: right panel "Everything -- Paints 421 nodes, 4,180 edges, default look". The canvas still
shows the "Reading 3 tables" card; no picture.

Think-aloud: "Still reading. I never actually see the picture. The counts say it's the right
picture, but I can't tell you what it looks like. In the real tool I'd have waited a few more
seconds; here it never finished."

## My answer

32 swipes point at someone or something not on the lists: 25 swipes name a person_id that is not
in the people sheet, and 7 name a building that is not in the buildings sheet (B12, for one).
No swipe is bad on both ends; 4,212 - 4,180 = 32 checks out. The graph has 421 nodes (412
people, 9 buildings) and 4,180 swipe edges.

Caveat I would write in the case: of those 25, some are almost certainly real people whose badge
number lost its leading zeros (swipe '7' vs. Wei Chen '0007'). The tool flags 3 such keys but I
could not see how many swipes they cover or merge them, so the true "unknown person" count is 25
minus however many swipes those 3 keys have.

## Debrief

Succeeded? Mostly. I have the count and I trust it, because the tool showed me both halves and
they add up. I'd put an asterisk on it for the leading zeros. I never saw the finished picture,
only the load card with the right node and edge counts.

Single Ease Question: 5 of 7. Finding the number was easy -- it was waiting for me in the match
report, in rows not just values. Points off for the "32 rows" link that shows 3, the "3 keys"
link that shows 1 and no count of affected swipes, and no way to tell it '7' and '0007' are the
same id.

Would I use it instead of my current tool? For this job -- joining three exports and finding the
orphans -- it beat my notebook on time, and the "Local only" chip is the right first message.
But my notebook gives me the 32 rows as a dataframe I can hand to physical security, and here I
couldn't get them out as a list. Until those 32 rows can leave as a CSV, I'd use this to look
and pandas to report.
