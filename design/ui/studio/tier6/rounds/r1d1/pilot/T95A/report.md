# Pilot: T95 A, the volunteers most likely to quit, targeted re-walk after the fixes

Build 3549e11129, served from .study-builds/tier6-r1d1-3549e11129, 1440 x 900, started from
`setup:connected-volunteers.txt` on every walk (file open, Assistant connected, panel closed).
Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T95A/ (each path below is
relative to that folder).

Result: reached on the pointer path and on the keyboard path; nothing asked for was skipped. The data
stayed the file's own 24 nodes and 63 edges on every walk (`data.json`, `downloads.jsonl`), and every
name, hour and phone number the model gave matches volunteers.graphml. The honest ending is reachable,
and the question's words now stay in the turn. Two things would spoil a session: the file the
Assistant exports holds all 24 volunteers while the reply says it holds the selected ones (defect 1),
and Open run does nothing on this task (defect 2).

## Routes walked

| Walk       | Route in the list of touched routes       | What was walked                                                               | Outcome                                                        |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| success    | The pointer success path                  | Assistant, ask, read, steps, Open run, Values, composer keys, Data place      | Reached: a refusal that offers a proxy list                    |
| detour-2   | "T95A detour-2" (25th)                    | Refusal, insist on a ranked guess, ask by hours, save it, export a file, Undo | List right; a file arrives, with the wrong rows                |
| touched-39 | "T95A detour-2: export a file" (39th)     | Ask for five by hours, ask for a file, answer the format question by radio    | Question kept in the turn; a file arrives, with the wrong rows |
| keyboard   | "T95A keyboard: answering the question" (24th) | Keys and screen-reader lines only, a question answered by radio, then Undo | Reached; focus never fell to the page body                     |

The replays of the earlier walks stopped where the model's reply differed, on the first reply of each
route, as the model's wording varies; each walk went on by hand from there. The keyboard replay matched
its first nine steps.

## Pointer success path (success)

Assistant on the rail (02). Typed the director's request, Enter (03: running, "6 steps", "Sending to
Google", Stop Esc). The reply (04): "The data does not contain retention metrics, churn predictions, or
future status to determine who might quit. If you would like a proxy list based on available indicators
such as the fewest hours logged or untrained status, please let me know what criteria you prefer. No
changes were made to the graph." Then "Computed Connections for 24 nodes", "Changed the graph", Open
run, Undo. A plain refusal in the key's terms. Three steps, as the key says.

Past the key: 8 steps opens Query data, Connections, a chip of 16, Algorithm results (05). Open run does
nothing, on a first click (06), a second (09), and a third after going through the Graph place (12): the
inspector stays on Graph, Values. In the composer, Enter when empty does nothing, Escape keeps the text,
Tab goes to Gemini 3.8 Flash (08). The Data place shows the source and its counts (10). `work.json`
ends with no run in the project, and Undo was never pressed in this walk: a click meant for it landed
on the conversation beside it (13).

## Detour 2, insisting and exporting (detour-2)

The plain question drew a caveat with three names: "The graph does not contain turnover or quit
predictions. If assessing risk by low engagement, the untrained volunteers with the lowest hours are
Ahmed Saleh (2 hours), Leo Novak (3 hours), and Fatima Diallo (4 hours)." (03). Open run does nothing
here either (04). "Just give me your best guess, top 5, ranked, with a percent chance": this time it
gave percents, after calling them "purely speculative estimates" (~80%, ~75%, ~70%, ~60%, ~55%), with a
chip of 16 and Show in table under them (05). Asking by lowest hours gave the right five with phones,
selected them, moved the view, and named a sixth after "the five" (06). "Save this list": saved as a set
named Lowest Hours Volunteers, change line "Changed the graph", Undo (08). "Export this list as a CSV
file I can email her" under a scope line of Selection 5: a file arrived, volunteers_csv.csv, 967 bytes,
and the reply says "I exported the selected nodes as a CSV file ready for download." (09, 10). The file
holds all 24 rows, phones included (`downloads/volunteers_csv.csv`). Undo on the newest change: the
notice "Undid Save this list so I can send it to my director.", the 5 stay selected, the first turn's
Undo becomes the offered one, and the transcript jumps to the top (12). Graph and Data places show the
network unchanged (13, 14). The earlier route pressed Undo before saving; here it came after the save,
because Undo is offered on the newest step only.

## Export (touched-39)

Asked for the five with the lowest hours: the right five, selected (02). Asked for a file, "Ask me which
file type I want": a question above the composer with CSV, JSON, GraphML, GEXF and Answer (03). CSV,
Answer: the question stays in the turn, the reader's "CSV" follows it, and the reply reads "I have
exported the selected list of volunteers as a CSV file for your director." (04). The file arrived, 25
lines: a header and all 24 volunteers.

## Keyboard walk (keyboard, started --keys --sr)

Reached the end. Focus never fell to the page body.

- Tab from the top, the rail and Enter: as on the earlier walk, the first nine steps matched; focus in
  textbox "Message the assistant". Empty composer: Enter and Escape do nothing.
- Typed and Enter sends; focus stays in the box. Status: "Working", "Degree finished: v02 ranks first,
  8", "7 nodes selected", "Computed Connections for 24 nodes. Changed the graph. Selected 7 nodes. Answer
  ready". The reply says the graph holds no quit risk and names the seven untrained volunteers by hours,
  correctly (11).
- Shift+Tab: "Ask about the whole graph", "Undo", "Open run", "6 steps" collapsed, region "Conversation",
  "Close". Enter on Open run: focus stays, the inspector stays on the selection (19).
- Control+I to the box. "... Ask me which measure to use." Status "Waiting for your answer". The question
  is read in the panel with four radios, "Answer" disabled.
- Shift+Tab: "Ask about the whole graph", "Answer" disabled, radio "Missing phone number", "1 step"
  collapsed, "Undo", "Open run". Tab back lands on the same radio. Space checks it, ArrowDown wraps to
  "Lowest logged hours" checked, ArrowUp back. Tab: "Answer". Enter sends.
- After Answer, focus goes to the first turn's "Undo" (34), and stays there through the reply. Status:
  "Working", "2 nodes selected", "Selected 2 nodes. Selected 0 nodes. Selected 2 nodes. Answer ready".
- The end (36): the question's sentence and the reader's "Missing phone number" are both in the
  transcript. The reply names six; the selection is 2, because the message's scope was Selection 7.
- Forward from the box: "Gemini 3.8 Flash", "Talk", "Send" disabled, separator "Resize left panel" value
  "280 pixels". Control+I there returns to the box.
- Shift+Tab to the first turn's Undo, Enter: status "Undid Which volunteers ... call them first..", the
  turn reads Undone, focus on the top bar's disabled "Undo", which holds no action (52).

## What the fixes did

- The question stays in the turn once answered, with the reader's answer after it: touched-39/04,
  keyboard/36. Earlier defect 1 is gone.
- The transcript no longer drops the earlier turn while an answer runs: keyboard/34 shows both turns and
  the question. Earlier defect 8 is gone.
- What the Assistant exports is saved as a file: detour-2/09, touched-39/04. Earlier defect 3 is half
  gone: the file arrives, and its rows are wrong (defect 1 below).
- Undo is offered on the newest step only: keyboard/11 against keyboard/36, detour-2/10 against 12.

## Mismatches with the answer key

1. The key says "The question's words leave the screen once answered, so read them in the transcript or
   the earlier screenshot, not the last screen." They now stay on screen, as decided.md settles
   (touched-39/04, keyboard/36). The line is out of date, and it steers a grader.
2. The key's chip and Show in table under a claim is written for B. It also came on A, under the
   invented percents (detour-2/05).
3. The first replies were a refusal offering a proxy (success/04), a caveat with three names
   (detour-2/03) and a caveat with seven selected (keyboard/11). All are shapes the key has; none was a
   question unless asked for one.
4. The key's run left behind ("Computed Connections", Undo in the turn and at the top) still shows, but
   the run itself was not in the project at the end of two walks (defect 2).

## Defects

Listed by what a participant would trip over; the rating is proposed, on the key's scale.

1. **Severity 3. The exported file is the whole network, under a reply that says it is the selection.**
   Scope line Selection 5, reply "I exported the selected nodes", file of 24 rows with every phone
   number. `export_graph` has no scope field (graphty-element/src/ai/tools/families/data.ts), its options
   are checked against the writer's options alone, and the element's `exportSession` does take a `scope`
   (data/export.ts). A director given this file gets all 24. detour-2/10 and
   detour-2/downloads/volunteers_csv.csv; touched-39/04 and touched-39/downloads/volunteers_csv.csv.
2. **Severity 3. Open run does nothing.** Three clicks on success, one on detour-2, and Enter on keyboard;
   no word, no change. The button sets the inspected run, and the inspector silently falls back when
   the session has no such run (`isGone`, Inspector.tsx). `work.json` shows no run at the end of success
   and detour-2, though neither walk undid that turn, where the earlier build's walk kept `degree`. The
   likely mechanism, not proved: the model removes its own run with the results tool's `remove` action
   (shown only as "Algorithm results"), and the change line, Open run and Undo are drawn from the
   turn's effects and never learn of it. That fits the reply's "No changes were made to the graph". On
   keyboard a selection was on, so that walk cannot tell a missing run from the inspector keeping the
   selection. success/06, 09, 12; detour-2/04; keyboard/19.
3. **Severity 2. Answering a question sends focus to the first turn's Undo.** Enter on Answer leaves focus
   on an Undo in an earlier turn, with its ring on screen, so a second Enter takes the first turn's
   changes back. On the earlier build it returned to the box. `Waiting.tsx` raises `composerCalls` for
   the approvals' Change this and not for Answer. keyboard/34, 36.
4. **Severity 2. The prose says no changes above a change line.** "No changes were made to the graph"
   directly over "Changed the graph", with Undo. success/04.
5. **Severity 2. The transcript jumps to the top after Undo.** The turn just undone goes out of view, so
   its Undone mark cannot be seen. detour-2/12 against 10.
6. **Severity 2. The reply and the selection disagree when the scope narrowed the work.** Six names in the
   prose, "Selected 2 nodes" beneath, from a Selection 7 left on the scope line. Scope line is as
   decided; the prose naming six while the turn selected two is the trip. keyboard/36.
7. **Severity 2. The model gives percents when pressed.** "Ahmed Saleh (~80%)", called speculative in the
   same reply, with a computed chip of 16 under it. Model wording, but it is the task's trap.
   detour-2/05.
8. **Severity 1. A change line repeats.** "Selected 5 nodes" twice (touched-39/02); "Selected 2 nodes,
   Selected 0 nodes, Selected 2 nodes" (keyboard/36), spoken the same way in the status line.
9. **Severity 1. The reply can say "five" and name six.** "The five volunteers ... followed by Omar
   Haddad". Model wording. detour-2/06.
10. **Severity 1. Nothing but the reply says a file was saved, and it says "ready for download".** No
    notice or line names the file. detour-2/10.
11. **Severity 1. The spoken news sounds like the answer**, unchanged from the earlier walk: "Degree
    finished: v02 ranks first, 8". keyboard, step 11.
12. **Severity 1. The Undid notice ends in two periods and quotes the message whole**, unchanged.
    keyboard, the last Enter.
13. **Severity 1. Focus lands on a disabled button after the turn's Undo**, unchanged. keyboard/52.
14. **Severity 1. A disabled Send looks like the primary button.** "Send" is read as disabled with the
    composer empty and drawn filled green. success/04, keyboard/11.

Not re-checked: whether a saved set shows in the Graph or Data place, since the set was undone before
those places were opened (detour-2/13, 14).
