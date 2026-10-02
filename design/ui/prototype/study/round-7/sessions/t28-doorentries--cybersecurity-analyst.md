# Session: bring this week's door swipes into the March project -- Priya, threat hunter (SOC)

Task as given: "Facilities just sent this week's door swipes from the new wing. Bring them into this
project alongside March's. The data on screen is a sample: a company's door swipes, people and
buildings. If that is not your line of work, treat it as your own records of who touched what."

Start screen: shots/tasks/t28-doorentries/01.png. Renders: tmp/round-7-sessions/t28-doorentries--cybersecurity-analyst/NN.png.
All commands were run from design/ui/prototype. P = $PWD/tmp/round-7-sessions/t28-doorentries--cybersecurity-analyst.

## Outcome

- Succeeded: NO. Gave up. Nothing I tried added a second file to the March entries. Every
  route that opened a file opened it "as a new graph" (and not with my file).
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool: not for this. Today I `pd.concat` the two CSVs in
  my notebook and re-import. That takes a minute and I know exactly what happened. What I would
  steal from this tool is the match report in the source editor (see step 7). It's better than
  what I have.

## Think-aloud, step by step

1. **Start (01.png).** "Door entries, March 2026", "Local only" chip in the header. Good, at
   least it claims it doesn't call out. I want to add rows, so the Data rail is where I'd look.

   `timeout 120 node app-b/study.mjs --try $P/02.png task:t28-doorentries --click "Data"`

2. **Data panel (02.png).** Sources: people.csv (412), buildings.csv (9), entries.csv (4,212
   rows, 1,306 edges). New wing swipes are more entries, same shape. I want to APPEND to
   entries, not make anything new. There's a plus by Sources and a "..." on each source.

   Guessing the plus's name took me three tries:
   `--click "Data" --hover "Add source"` -> nothing on screen is called "Add source" (03.png)
   `--click "Data" --click "Add source"` -> same (04.png)
   `--click "Data" --hover "Add"` / `"Add data"` / `"Add a source"` (the last: nothing called that)
   `timeout 120 node app-b/study.mjs --try $P/05.png task:t28-doorentries --click "Data" --hover "Add data"`

3. **Tooltip (05.png).** "Add data to this graph". That's what I want.

   `timeout 120 node app-b/study.mjs --try $P/06.png task:t28-doorentries --click "Data" --click "Add data"`

4. **Menu (06.png).** File..., From a URL..., Paste..., Set collection... No idea what
   "Set collection" means. Facilities emailed a file, so File.

   `... --click "Data" --click "Add data" --click "File..."` (07.png)

5. **File chooser (07.png).** "Data file: CSV, JSON, GEXF or GraphML", a recipe file, and a style
   file. Data file.

   `... --click "Data" --click "Add data" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"` (08.png)

6. **Wrong place (08.png).** The header now says "Open as a new graph" and the title flipped to
   "Transfers, March 2026". It's account-to-account transfers, not door swipes. I clicked "Add data
   to THIS graph" and it is opening a NEW graph. Did it close my project? This is the silent
   switch I don't trust. Cancel.

   `... --click "Data file: CSV, JSON, GEXF or GraphML" --click "Cancel"` (09.png)
   -> back on Door entries, toast "Load cancelled: nothing was loaded" with Undo. Fine, at least
   it told me.

   Then I went for the "..." on the entries.csv row. Guessing names again:
   `--hover "More actions"` -> that's the right-hand panel's menu (10.png), not the row's
   `--hover "entries.csv actions"`, `"More actions for entries.csv"`, `"entries.csv options"`,
   `"Source actions"`, `"Table actions"` -> nothing called that
   `--hover "Actions for entries.csv"` -> found it
   `timeout 120 node app-b/study.mjs --try $P/11.png task:t28-doorentries --click "Data" --click "Actions for entries.csv"`

7. **Row menu (11.png).** Rename, Replace with file..., Edit source..., Refresh. There's no "append"
   or "add rows". Replace would wipe March, so no. I tried Edit source.

   `timeout 120 node app-b/study.mjs --try $P/12.png task:t28-doorentries --click "Data" --click "Actions for entries.csv" --click "Edit source..."`

8. **Source editor (12.png).** This is the good part of the session. The match report says 4,212
   rows, 4,180 with both ends, 25 badge ids not in people, 7 rows at B12 "not in buildings",
   and 3 keys that differ only by leading zeros and were NOT merged. It shows the actual
   offending rows highlighted. That's exactly the "if my fields don't line up your graph is fiction"
   check, and it's done for me. B12 is probably the new wing, which buildings.csv doesn't know yet,
   so the new swipes will need a buildings row too. There's a plus next to "Tables".

   `--hover "Add table"` -> nothing called that; `--hover "Add a table"` -> found
   `timeout 120 node app-b/study.mjs --try $P/13.png task:t28-doorentries --click "Data" --click "Actions for entries.csv" --click "Edit source..." --click "Add a table"`

9. **(13.png)** File / From a URL / Paste again. I'm inside "Edit: entries" this time, so I hoped
   it would land next to March.

   `... --click "Add a table" --click "File..."` (14.png)

10. **(14.png)** A little toast: "Opens the file picker". Then nothing. No picker, no file, no new
    table on the left. Dead end.

11. **Tried "Set collection" (15.png).** I hoped it meant "several files that are one table", like
    weekly drops.
    `timeout 120 node app-b/study.mjs --try $P/15.png task:t28-doorentries --click "Data" --click "Add data" --click "Set collection..."`
    -> the same Transfers / "Open as a new graph" screen as step 6. So every option leads to the
    same place.

12. **Is "Open as a new graph" a switch? (16.png)**
    `... --click "Data file: CSV, JSON, GEXF or GraphML" --click "Open as a new graph"`
    -> no, it's just a label. No way to say "add to Door entries instead".

13. **Paste inside the entries editor (17.png).**
    `timeout 120 node app-b/study.mjs --try $P/17.png task:t28-doorentries --click "Data" --click "Actions for entries.csv" --click "Edit source..." --click "Add a table" --click "Paste..."`
    -> the title became "Les Miserables" and it is "Open as a new graph" with some XML I never
    pasted. I started inside "Edit: entries" and it still threw me into a new graph. I gave up here.

## What went wrong, in my words

- "Add data to this graph" opens "Open as a new graph". The tooltip and the screen contradict
  each other, and the project title in the header changes under me. That's the worst kind of
  surprise. I couldn't tell whether my March project was still open.
- Nowhere offers "append rows to entries" or "this file has the same columns as entries.csv".
  That is the whole job: same schema, next week's rows. The source menu only has Replace.
- The plus inside the entries editor ("Add a table" > File) does nothing visible.
- Paste from inside the entries editor also jumps to a new graph, with a different title.
- I couldn't find out what "Set collection" means. Its only result was the same new-graph screen.
- Icon buttons with names I had to guess: the Sources plus is "Add data", the row "..." is
  "Actions for entries.csv", the Tables plus is "Add a table". That's three names for "add" and
  "more".
- Nothing tells me the time range of what's loaded ("March 2026" is only in the title). Once a
  second week is in, I need to see that the range now runs past March 31, or the project name is
  wrong.

## What worked

- "Local only" in the header, before I asked.
- Cancel said "Load cancelled: nothing was loaded" and offered Undo.
- The match report in the source editor: unmatched ids counted and shown row by row, the
  leading-zero key collision called out, a note flagged as pointing at a node that is gone. I'd
  put that in a case file.
