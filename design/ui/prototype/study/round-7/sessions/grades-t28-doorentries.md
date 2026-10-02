# Round 7 grades: t28-doorentries, "bring this week's door swipes in alongside March's"

The task: the door-entries project (March 2026: people, buildings and 4,212 swipe rows) is open.
Facilities has sent this week's swipes from the new wing; the participant brings them into the
project alongside March's. The file they send is a header row with nothing under it, which the
participant is not told.

What counts as success: the Data page opens with the new file and its refusal ("Untitled.csv has a
header row and nothing under it, so it holds no nodes and no edges"); the participant reads it and
says the export holds no swipes, and that they would ask facilities for a new one or pick another
file. Success with difficulty: looks for a setting that would make it load before reading the
message. Failure: believes the wing was loaded, or that graphty is broken.

The designed path is: the door-entries graph at rest -> the Data page showing the refused empty
file (shots/tasks/t28-doorentries/02.png).

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## The task could not be completed in this skeleton

Before the grades: no click in the skeleton reaches the refusal screen. The only route into the
Data page from the door-entries project is Data > "Add data" (the plus beside Sources) > File... >
"Data file: CSV, JSON, GEXF or GraphML", and that item is wired to a canned stand-in, a
9,113-row bank-transfers file (transfers-2026-03.csv) under a header that renames the project
"Transfers, March 2026". The refused-empty state exists in the Data page section but nothing links
to it. "Set collection...", Paste... and "Replace with file..." also lead to other canned files
(transfers again, a Les Miserables GraphML snippet, transfers-2026-04.csv), and the file item under
"Add a table" only shows a toast, "Opens the file picker".

So none of the three participants ever saw the message this task exists to test. The sessions say
nothing about whether the refusal reads clearly. They do say a lot about the path that leads to it
(below). This task needs the file chooser to open the empty file when it is chosen from the
door-entries project, and then it needs to be run again.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst (Priya) | gave up | **gave up** | Took the designed first steps (Data > Add data > File... > Data file) and got the transfers stand-in under "Open as a new graph"; cancelled. Then tried the entries.csv "..." menu (Replace rejected because it would wipe March), Edit source > Add a table > File... (toast only), Set collection (transfers again) and Paste (Les Miserables). Last screen: a pasted GraphML snippet titled "Les Miserables", Load off. Concluded that nothing adds a second file to March's entries. Did not believe the wing was loaded; did not call graphty broken, called the path untrustworthy. |
| Intelligence analyst (Marcus) | gave up | **gave up** | Same first four steps, same transfers screen; read it as the wrong file and a contradiction ("Add data to THIS graph" vs "Open as a new graph"), cancelled, confirmed by the toast that March was safe. Tried the entries editor's Add a table > File... (toast only), the entries.csv menu (Replace rejected) and Set collection (transfers again). Last screen: the transfers file, unloaded. Concluded he could not add the week; did not believe it was loaded. |
| Knowledge engineer (Min-ji) | gave up | **gave up** | Started from the "from 3 tables" link into the entries editor, tried Add a table > File... (toast only), file settings, the project and main menus, then Data > Add data > Set collection and > File... > Data file (both transfers), Paste (Les Miserables) and Replace with file (transfers-2026-04.csv). Stopped after "three unexplained jumps into other graphs". Last screen: Replace on the transfers project. Concluded no path keeps her in the door-entries project; did not believe the wing was loaded. |

**Tally: 0 success, 0 success with difficulty, 0 failure, 3 gave up (3 sessions).**

None of the three is a failure under the rubric: nobody believed the swipes were loaded, and nobody
concluded graphty itself was broken. All three stopped because every file path either showed a
file that was obviously not theirs or did nothing. Two of the three (cybersecurity analyst,
intelligence analyst) took exactly the designed first steps, so with the stand-in fixed they would
have landed on the refusal screen at step four. The third began in the entries editor and reached
the same file chooser later.

## What the sessions show

Counts are out of 3. Findings caused by the canned stand-in files are listed separately at the end
and carry no severity.

1. **"Add data to this graph" opens a screen headed "Open as a new graph".** 3 of 3 read the two
   labels as contradicting each other and took the second as the truth: they feared the March
   project had been closed or was about to be replaced. This is not only a stand-in artifact: the
   designed refusal screen (shots/tasks/t28-doorentries/02.png) carries the same "Open as a new
   graph" header over the "Door entries, March 2026" title. Two of the three cancelled at this
   screen precisely because of the header. Nielsen severity 3 (major): it is the first screen of
   the designed path, and it tells a careful user to back out.

2. **There is no way to add more rows of an existing table.** 3 of 3 framed the task as appending
   this week to entries.csv ("same columns, more rows") and looked for "Append" or "Add rows from
   file" in the entries.csv "..." menu, which offers Rename, Replace with file..., Edit source...
   and Refresh. 3 of 3 rejected Replace because it would discard March. 3 of 3 also read "Add a
   table" in the entries editor as the wrong noun ("a second week is not a new table"). The
   design's answer for this task is the refusal, but the job the participants were doing, adding a
   week to a table that already exists, has no home in the skeleton whether the file is empty or
   not. Nielsen severity 3 (major): a recurring job for anyone with periodic exports (logs,
   swipes, transfers), with no designed path at all.

3. **"Set collection..." means nothing to anyone.** 3 of 3 opened it hoping it meant "several files
   that are one table", which is the job they had. Nobody could say what a collection is. Nielsen
   severity 2 (minor), raised to watch: it is the one label that might have answered finding 2, and
   it did not explain itself.

4. **"Add a table" > File... does nothing visible.** 3 of 3 chose it from inside the entries editor
   and got only a toast reading "Opens the file picker". In the skeleton this is a placeholder, but
   it is also the one add path that would have stayed inside the project, so all three expected
   it to ask "rows of entries, or a new table?". Nielsen severity 2 (minor) as a skeleton gap; the
   question it should ask belongs with finding 2.

5. **The match report on the existing file was the best thing in the session.** 3 of 3 opened the
   entries editor and praised, unprompted, the counts of unmatched badge ids (25), the 7 rows at a
   building not in buildings (B12, which two guessed is the new wing), and the leading-zero keys
   "not merged". 2 of 3 said that if adding the new week showed the same report for both weeks
   together (new rows, new people, overlapping dates, double-counted swipes), they would switch
   tools for this job. Not a problem; a direction for finding 2.

6. **Cancel was trusted.** 2 of 3 cancelled the import and read "Load cancelled: nothing was
   loaded" as proof March was intact. Not a problem.

7. **Nothing shows the date range of what is loaded.** 1 of 3 (cybersecurity analyst): "March
   2026" lives only in the project title, so after adding a week the title would be wrong and
   nothing would say so. Single voice; recorded, not weighted.

## Artifacts of the stand-in, not findings

- The project title changing to "Transfers, March 2026" or "Les Miserables" (3 of 3 noticed; the
  knowledge engineer quit over it). This comes from the canned files, not from the design, but it
  dominated every session and is the main reason all three stopped.
- Guessing the accessible names of the icon buttons ("Add data", "Actions for entries.csv", "Add a
  table") cost 3 of 3 several tries. That is the study tool's click-by-name interface; a sighted
  participant would click the icon. The three different names for three plus and "..." buttons are
  worth a look by the shell owner, but the effort spent here does not measure the design.
