# Session: three security spreadsheets into one picture -- knowledge engineer (Dr. Min-ji Kim)

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes
point at a person or a building that is not on those lists."

Renders are in design/ui/prototype/tmp/round-7-sessions/t18--knowledge-engineer/.
Every command was run from design/ui/prototype.

## Start screen (shots/tasks/t18/01.png)

"OK, I am already in an import screen called 'Open as a new graph', with three tables on the left:
people 412, buildings 9, entries 4,212. The people table is selected. Good, it shows me what each
column IS: id is Key, name is Name, dept and badge are Attribute. That is the first thing I check.

The line at the top is the most useful thing on the page: 'person (412) --entries (4,180 edges from
4,212 rows)--> building (9)'. That is a schema statement. Class, predicate, class, with counts.
That is almost what I draw by hand for stakeholders. And it already tells me 32 rows did not turn
into edges.

But wait. The match report for people says '412 rows, 1 repeated key (kept the first)'. I can see
it -- 1188 Priya Nair twice, two badges. So that is 411 distinct people, not 412. Why does the
header still say person (412)? Either the header counts rows or the report is wrong. I will come
back to that. And 'kept the first' -- silently dropping badge B-21141 is a merge decision. At least
it told me."

## Step 1 -- look at the swipe table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t18--knowledge-engineer/01.png task:t18 --click "entries"

"Entries: each row is an edge, person to building, one edge per row. person_id is From -> person,
building_id is To -> building, time is Time. That mapping is right and I did not have to do it.
I do note it calls the relationship 'entries' -- the table name -- and not a predicate I chose. For
this data that is fine.

Match report: 4,212 rows; 4,180 have both ends. 25 person_id values (25 rows) not in people,
7 building_id values (7 rows) not in buildings, 'Show the 32 rows'. Each with 'Add as people' /
'Leave out', and Leave out is the default. Good -- it does not invent nodes for dangling
references unless I ask. That is exactly the Gephi failure it avoids.

Then the line I actually care about: 'person_id is Number here and Category in people: matched as
text. 3 keys differ only by leading zeros (not merged).' Row three is '7 -- Not in people', and the
people table has 0007 Wei Chen. So at least some of my 25 'unknown people' are probably not
unknown at all; they are a type mismatch between two exports. That changes the answer."

## Step 2 -- what are the leading-zero keys?

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t18--knowledge-engineer/02.png task:t18 --click "entries" --click "3 keys"

"It filters the sample to the rows whose key differs by leading zeros: one of the eight sample
rows, the '7'. 'Show all rows' would give me the rest. Fine. But there is nothing here that says
'treat 7 and 0007 as the same key' or 'pad to four digits'. It tells me the problem and then leaves
me with no lever. Do I have to fix the CSV in Excel and re-import? Probably."

## Step 3 -- the 32 rows

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t18--knowledge-engineer/03.png task:t18 --click "entries" --click "Show the 32 rows"

"Filters to the unmatched rows: 7 not in people, 1530 not in people, B12 not in buildings. Each
cell is flagged with which end failed. That is a decent violation report -- it reads like a SHACL
result, focus node and path. I would want to export this list as a file for the data owner; I did
not see an export here."

## Step 4 -- can I change how person_id is matched?

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t18--knowledge-engineer/04.png task:t18 --click "entries" --click "From -> person"

"Role menu: From, To, Subtype, Name, Time, Weight (disabled, with a reason -- good), Edge id,
Position, Attribute. These are roles, not types. Nothing about the data type or normalizing the
key. So no, I cannot fix the leading zeros in the tool. I am not going to go hunting further; the
report already told me it is not merged."

## Step 5 -- load it

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t18--knowledge-engineer/05.png task:t18 --click "entries" --click "Load"

"'Reading 3 tables -- people.csv, buildings.csv, entries.csv: 421 nodes, 4,180 edges...' with a
progress bar and Cancel. Good, it tells me it is working instead of freezing.

4,180 edges matches the report. 421 nodes is 412 + 9. But I was told one person key was repeated
and only the first was kept. 411 + 9 is 420. So either the duplicate became its own node, or the
'kept the first' message is wrong, or the count is rows. One unexplained mismatch. I would not put
421 in a report until I knew which."

## My answer

"The picture: people and buildings as nodes, one edge per swipe from person to building -- 4,180
edges. The swipes that point at someone or something not on the lists: 32 rows out of 4,212 --
25 rows whose person is not in the people list and 7 rows whose building is not in the buildings
list. Caveat I would write next to the number: at least some of those 25 (the tool says 3 keys)
differ only by leading zeros, like 7 versus 0007, so the true count of genuinely unknown people is
probably lower -- possibly 22 -- if those are the same badge holders. The tool will not merge them for
me, so 32 is the count as the files stand."

## Debrief

- Succeeded? Yes, I think so. I have the picture loading and a number, 32 (25 + 7), and I know
  why that number might be an overcount. I never saw the finished picture on screen, only the
  loading panel, so I cannot vouch for what it draws.
- Single Ease Question: 6 out of 7. The schema line and the match report did the work for me. I lose
  a point for the 412 versus 411 versus 421 count mismatch and for the leading-zero problem being
  reported with no way to fix it.
- Would I use this instead of my current tool? For this job -- joining three CSV exports and
  finding dangling references -- yes, over a pandas notebook, because the dangling-reference report
  is right there and it does not invent nodes. It is still not an RDF tool, and it is still a CSV
  path, so for the knowledge graph itself I stay with SPARQL. And I need the counts to agree with
  each other before I trust it with a governance report.

## Problems noted

1. The header says person (412) and the load says 421 nodes, but the people report says one key is
   repeated and only the first was kept, which should give 411 people and 420 nodes. Unexplained
   count mismatch.
2. The leading-zero mismatch (7 vs 0007) is detected but there is no way to match those keys in
   the tool; the only path is to fix the source file.
3. No visible way to export the 32 unmatched rows as a list for the data owner.
4. 'Kept the first' on a repeated person key silently discards the second row's attributes (a
   second badge); I would want to see what was dropped.
