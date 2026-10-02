# Session: keep a remark on Ana Ruiz's visits to B1 -- cybersecurity analyst (Priya)

Task as given: "Your security lead wants a remark kept on Ana Ruiz's visits to building B1 --
that connection, not her or the building alone -- saying the visits need checking against her
badge record. Nobody has typed a name into this program. The data on screen is a sample: a
company's door swipes, people and buildings."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/.

## Start screen (shots/tasks/t06-doorentries/01.png)

"Door entries, March 2026. Top bar says 'Local only' -- good, that answers half my first question.
Doesn't say whether it phones home, but fine, it's a study. 421 nodes, 412 person, 9 building,
1,306 edges. A hairball in the middle, which I'll ignore. First thing I do is what I always do:
search for the entity I know. There's a 'Find rows and notes' box."

## Step 1 -- the search box

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/01.png task:t06-doorentries --click "Find rows and notes"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/02.png task:t06-doorentries --click "Find rows and notes" --type "Ana Ruiz"

01: the box takes focus. 02: I typed "Ana Ruiz" and nothing shows in the box and nothing filters.
"So the search box doesn't take my typing. In real life I'd assume it hung or I'm in the wrong
field. Fine, I'll go to the table -- I trust a table more anyway."

## Step 2 -- the table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/03.png task:t06-doorentries --click "Table"

03: the bottom table opens on Edges: 1,306 edges "from entries.csv, one per person and building",
columns person_id, building_id, count (sorted descending), time (earliest), time (latest), Notes.
Top row 1001 -> B1, 22 entries, Mar 2 07:58 to Mar 27 17:12, already one note.
"Good -- one row per person and building, with a count and a time window. That's exactly the
'connection' my lead means. But it's IDs, not names. Which one is Ana?"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/04.png task:t06-doorentries --click "Table" --click "Nodes"

04: Nodes table, 1001 = Ana Ruiz, Facilities. "OK, 1001 is Ana. So the top edge row is the one.
Annoying that the edge table shows person_id and not the name -- I had to pivot to a second tab to
decode it. Splunk would let me lookup the name right into the row."

## Step 3 -- select the row and attach a note

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/05.png task:t06-doorentries --click "Table" --click "22"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/06.png task:t06-doorentries --click "Table" --click "1001"

05 and 06: the row goes blue, and a tooltip appears over the toolbar saying "Selects the edge
1001 - B1". But the right panel still says "Door entries", the graph. "It says it selects the
edge. Did it? The panel on the right didn't change. I don't believe it."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/07.png task:t06-doorentries --click "Table" --click "1001" --key n

07: N opened a note composer in a Notes panel, but its subject chip says "Door entries" -- the
whole graph, not the edge. "There it is. It'd have put my remark on the entire dataset. That's
exactly the mistake my lead told me not to make. Good thing I read the chip." Below the composer
I can see three existing notes, one of them tagged "Ana Ruiz -> B1 . entries". "So somebody
already managed to put a note on that connection. How?"

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/08.png task:t06-doorentries --click "Table" --hover "1"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/09.png task:t06-doorentries --click "Table" --click "1 note"

08: the speech-bubble in the row's Notes cell says "1 note". 09: clicking it threw me into a
completely different file -- "Les Miserables", a co-appearance graph with PageRank colors, not my
door swipes at all. "What? I clicked a note count and it swapped my data out from under me. In a
real trial that's where I close the tab. I'm only continuing because you asked."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/10.png task:t06-doorentries --click "Table" --click "1001" --click "Selection"

10: the Selection row in the left panel says "Paints 0 nodes". "Confirmed -- clicking the table
row did not select anything. The tooltip lied to me."

## Step 4 -- go in through the Notes list instead

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/11.png task:t06-doorentries --click "Notes"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/12.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries"

12: clicking the "Ana Ruiz -> B1 . entries" tag on the existing note makes the right panel show
"Ana Ruiz -> B1 / Edge, entries", Ends Ana Ruiz -> B1, count 22, 2026-03-02 to 2026-03-27, and a
Notes section with "1 note . Add note (N)". "Now that's the connection, with its count and time
range. That's what I wanted from the table click."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/13.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note"

13: the composer opens with the chip "Ana Ruiz -> B1". "Right subject this time. The edge, not her,
not B1."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t06-doorentries--cybersecurity-analyst/14.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note" --click "Write a note" --type "Check these visits against her badge record." --click "Save"

Output: "nothing on screen is called 'Write a note'" and "nothing on screen is called 'Save'".
14: same as 13; the box still shows the placeholder and Save is grayed out. "It won't take my
text. I'd type 'Check these 22 visits, Mar 2 to Mar 27, against her badge record' and hit
Ctrl+Enter. That's where I stop."

## Did I succeed?

Partly. I got the note composer attached to the right thing -- the Ana Ruiz -> B1 connection --
but I could not actually get the remark saved because the text box would not take my typing. And
I only found the right subject by piggybacking on a note someone else had already left on that
edge. If that note hadn't been there, I don't see how I'd have gotten the edge selected: the table
row click said it selected the edge and didn't, and N then attached to the whole graph.

## Single Ease Question

2 out of 7.

## Would I use this instead of my current tool?

No. For this job my current tool is a notes column next to a row in a spreadsheet or my notebook,
and that takes ten seconds. Here: the search didn't take a name, the edge table shows IDs not
names, clicking a row claimed to select it and didn't, pressing N quietly picked the whole
dataset as the subject, and clicking a note count swapped in a different file entirely. What I
did like, concretely: the edge row has count and first/last time right there, the edge's own panel
shows the time range, and the note composer shows a chip with what the note is about -- that chip
is the only reason I caught the wrong-subject mistake. Fix the table selection so a row click
really selects the edge and N attaches to it, and this becomes a reasonable place to keep
case remarks.
