# Pilot: T95 A, the volunteers most likely to quit, targeted re-walk on the frozen study build

Build 48879618c4, served from .study-builds/tier6-r1d1-48879618c4, 1440 x 900, started from
`setup:connected-volunteers.txt` on every walk (file open, Assistant connected, panel closed). Every
walk's `session.json` names that commit. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T95A/ (each path below is
relative to that folder). Walks of the previous build, 3549e11129, keep their plain names there; this
build's walks end in `-48879618c4`, since the tool refuses a folder that already holds a session.

Result: reached on the pointer path and on the keyboard path; nothing asked for was skipped. No crash,
no script error, no failed request. The data stayed the file's own 24 nodes and 63 edges on every walk
(`data.json`), and every name, hour and phone number the model gave matches volunteers.graphml.

One defect would spoil a session that goes as far as a file: the file the Assistant exports still
holds all 24 volunteers under a scope line of Selection 5 (defect 1). `git diff 3549e11129 48879618c4`
over graphty, graphty-element and compact-mantine is empty: this build has the same app code as the
walks before it, so nothing settled by the second dry run is in it. What differs between the two
builds' walks below is the model's run-to-run variation, not a fix.

## Routes walked

| Walk                 | Route in the list of touched routes            | What was walked                                                               | Outcome                                                     |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| success-48879618c4   | The pointer success path                       | Assistant, ask, read, steps, composer keys                                    | Reached: a caveat with three names, no change to the graph  |
| detour-2-48879618c4  | "T95A detour-2" (25th)                         | Caveat, Open run, insist on a ranked guess, ask by hours, save, export, Undo  | List right; two files arrive, each with all 24 rows         |
| touched-39-48879618c4 | "T95A detour-2: export a file" (39th)         | Ask for five by hours, ask for a file, answer the format question by radio    | All three replayed steps matched; the file has all 24 rows  |
| keyboard-48879618c4  | "T95A keyboard: answering the question" (24th) | Keys and screen-reader lines only, a question answered by radio, then Undo    | Reached; focus never fell to the page body                  |

Model calls: 5, 22, 12 and 6. Success and detour-2 replays stopped at the first reply, since the
model's wording varies; keyboard matched its first nine steps; each went on by hand from there.
A walk folder under the main checkout's tmp/ is not read as tier 6 by itself: `REAL_TIER=6` must be
set on the `--replay`, or the setup fails with `nothing on screen is called "Assistant"`.

## Pointer success path (success-48879618c4)

Assistant on the rail (02). Typed the director's request, Enter: running, "2 steps", then "4 steps",
"Sending to Google", Stop Esc (03, 04). The reply (05): "The graph does not contain churn predictions
or quit likelihood data. By engagement proxy, the volunteers with the lowest logged hours (all
untrained) are Ahmed Saleh at 2 hours, Leo Novak at 3 hours, and Fatima Diallo at 4 hours." A reader
can say honestly that this is a guess from hours. Three steps, as the key says. No change line, no
Open run, no Undo; top-bar Undo stays disabled.

4 steps opens to four Query data rows (06). In the composer, Enter when empty does nothing, typing
works, Escape keeps the text, Tab goes to Gemini 3.8 Flash (07). The end: 24 nodes, 63 edges, 0
selected, no run.

## Detour 2, insisting and exporting (detour-2-48879618c4)

The plain question drew a caveat with four names, right by the file, over "Computed Connections for 24
nodes", Open run, Undo (03). Open run works here: the inspector shows Degree, on an empty Style tab
(04). "Just give me your best guess, top 5, ranked, with a percent chance": this time it declined the
percents as "arbitrary" and ranked five by logged hours, with no chip (05). Asking by lowest hours with
phones gave the right five, "Filtered to 5 of 24 nodes", "Selected 5 nodes"; the drawing shows the five
alone, one edge, scope line Selection 5, Undo on the newest turn only (06).

"Save this list so I can send it to my director": "I saved the selected volunteers as a named set
called Lowest Hours Volunteers and exported the node list to a CSV file for you to share.", "Changed
the graph", Undo; steps Catalog four times, Export, Select (07 to 10). A file arrived,
`downloads/volunteers_csv.csv`: a header and all 24 volunteers, every phone number, and five
`results.degree` columns. `downloads.jsonl` records 5 visible nodes when it was written.

"Export this list as a CSV file I can email her", scope line still Selection 5: "I exported the node
list to a CSV file ready for you to download and email." (11, 12). A second file, `volunteers_csv
(2).csv`, identical to the first.

The Graph place lists no set (13). The Data place lists no set and no filter card, under five drawn
nodes (14). Undo on the save turn: notice "Undid Save this list so I can send it to my director.", the
turn reads Undone, the older turn gets the Undo, the transcript keeps its place (16). Undo again: the
network is back, 24 nodes and 63 edges drawn, the five stay selected as the key keeps (17).

## Export (touched-39-48879618c4)

The right five, selected (02). "Ask me which file type I want": a question above the composer with
CSV, JSON, GraphML, GEXF and Answer (03). CSV, Answer: the question stays in the turn, the reader's
"CSV" follows it, and the reply reads "I have exported the node list as a CSV file (967 bytes) for you
to save and share." (04). Scope line Selection 5. The file, `downloads/volunteers_csv.csv`, is a header
and all 24 volunteers.

## Keyboard walk (keyboard-48879618c4, started --keys --sr)

Reached the end. Focus never fell to the page body.

- Tab from the top, the rail and Enter: the first nine steps matched the earlier walk; focus in textbox
  "Message the assistant". Empty composer: Enter and Escape do nothing.
- Typed and Enter sends; focus stays in the box. Status: "Working", "Degree finished: v02 ranks first,
  8", "Waiting for your answer". The plain request drew a question with no asking: "The graph does not
  track churn or quitting likelihood. How would you like to identify volunteers at risk?" with four
  radios (11). The panel reads it in order (`--read`), "Answer" disabled.
- Shift+Tab from the box: "Answer" disabled, radio "Least connected volunteers (lowest degree)",
  "Undo", "Open run", "4 steps" collapsed, region "Conversation", "Close", "New conversation".
- Tab back to Open run, Enter: the inspector opens Degree, focus stays (14). Tab, Tab reaches the radio
  group. Space checks it; arrows move the check and wrap. Tab: "Answer". Enter sends.
- After Answer, focus goes to region "Conversation", with its ring around the whole transcript, and
  stays there through the reply (17). Status: "Working", "7 nodes selected", "Selected 7 nodes. Answer
  ready".
- The end (17): the question's sentence stays in the first turn, the reader's choice follows it, and
  the reply names the seven untrained volunteers with hours and phones, right by the file; 7 selected.
- Forward from the region: "4 steps", "Open run", "Undo", "1 step", "Undo", "Ask about the whole
  graph", textbox, "Gemini 3.8 Flash", "Talk", "Send" disabled, separator "Resize left panel" value
  "280 pixels". Control+I there returns to the box.
- Shift+Tab to the newest Undo, Enter: status "Undid Which volunteers ... call them first..", both turns
  read Undone (one step, as decided), focus on the top bar's disabled "Undo" (22). The run is gone, the
  7 stay selected.

## Mismatches with the answer key

1. The key says "On 3549e11129 a question came only when the reader asked for one." On this build, with
   the same app code, the plain request drew a question unasked (keyboard-48879618c4/11). Every shape
   the key lists came up; the question is not limited to a reader who asks.
2. The key says Open run can do nothing. It opened Degree both times it was offered here
   (detour-2-48879618c4/04, keyboard-48879618c4/14). The code is unchanged, so this is a run that kept
   its run, not a fix: earlier walks on the same code show the other outcome.

## Defects

The first would spoil a session; the rest would not, and are unchanged from the earlier walks except
where it says so.

1. **Severity 3. The exported file is the whole network under a scope line of Selection 5.** decided.md
   settles that what the Assistant exports is the bound selection, and `export_graph` in
   graphty-element/src/ai/tools/families/data.ts still has no target or scope field, so the rule is not
   in this build. Asked for "this list", the reader gets 24 rows and every phone number, and nothing on
   screen says so; a director given this file gets all 24. detour-2-48879618c4/downloads/volunteers_csv.csv
   and "volunteers_csv (2).csv", touched-39-48879618c4/downloads/volunteers_csv.csv.
2. **Severity 2. "Saved as a named set" appears nowhere a reader can look.** Re-checked with the set
   standing: neither the Graph place nor the Data place shows it. detour-2-48879618c4/13, 14.
3. **Severity 2. "Filtered to 5 of 24 nodes" leaves no trace in the Data place.** Five nodes drawn, the
   Filters section empty, Everything still counting 24; Undo is the only way back shown. It does work.
   detour-2-48879618c4/13, 14, 17.
4. **Severity 2. Answering a question leaves focus on the Conversation region, not the box.** Harmless to
   Enter, unlike the earlier walk where it landed on a turn's Undo, but the reader is six Tabs from the
   composer. The landing changes from run to run because nothing sends focus back after Answer.
   keyboard-48879618c4/17.
5. **Severity 1. The spoken news sounds like the answer.** "Degree finished: v02 ranks first, 8", an id,
   for a run nobody asked for. keyboard-48879618c4, step 10.
6. **Severity 1. The Undid notice ends in two periods and quotes the message whole.**
   keyboard-48879618c4/22.
7. **Severity 1. Focus lands on a disabled button after the turn's Undo.** keyboard-48879618c4/22.
8. **Severity 1. Nothing but the reply says a file was saved.** No notice or line names it.
   detour-2-48879618c4/10, 12.
9. **Severity 1. Open run lands on an empty Style tab.** Values holds everything.
   detour-2-48879618c4/04, keyboard-48879618c4/14.
