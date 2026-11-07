# Targeted re-pilot of tier 6 task T90A: getting the Assistant going on volunteers.graphml

Build 48879618c4 from .study-builds/tier6-r1d1-48879618c4, 1440 x 900, started empty on every walk.
Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T90A/ (shortened to
`T90A/` below). The walks of the previous build, 3549e11129, moved unchanged to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T90A/,
because the tool refuses a folder that already holds a session; this pass replayed from there. Every
walk's `session.json` names commit 48879618c4, and `data.json` reads 24 nodes and 63 edges, all
visible, from volunteers.graphml.

Result: reached. Nothing crashed, nothing blocked the task, and nothing seen would spoil its
grading. Nothing asked for was skipped. This pass walks the pointer success path and the three
routes the fixes touched that belong to T90A: the 26th, 30th and 42nd of the list. A keyboard walk
was not asked for.

## Routes walked

### Success path by pointer (T90A/success, 15 screenshots)

Replayed: steps 1 to 7 matched. Step 8 differs only in the local port inside the browser's own CORS
error for the OpenAI call, which changes every session, so the rest was walked by hand.

Open a file, volunteers.graphml; Assistant; AI provider...; Provider, OpenAI; API key, typed the
OpenAI key; Save; typed the question, Enter (09: "Sending to OpenAI", Stop Esc). About ten seconds
on: "Could not reach OpenAI: the connection failed. Nothing changed." with Send again, and the
question back in the composer (10). The model label, tooltip "Change provider or model" (11, 12),
with the disclosure above Save. Provider, Google, API key, the Google key, Save (13: the failure's
Send again and the question still there, the label Gemini 3.8 Flash, the chip "Sends to Google").
Enter (14): the reply says to call v09 (phone 555-0109), by closeness, and the inspector shows v09
as Hannah Weiss. The steps read Reach, Query data, Select (15). Fifteen steps, as the answer key
says. Four model calls.

### Send again twice, then the rest of detour 3 (T90A/touched-26, 18 screenshots)

Replayed to the same port difference at step 2, then walked by hand.

Send again twice (05): three questions and three identical failures; only the newest keeps Send
again, and the question stays in the composer. The conversations list opens with Open and Delete
(06). Closing it replays the three failures as notices, printed by the tool on the step to 07. New
conversation keeps the typed question (07). Settings, AI provider, Forget key (08), Done: back to
the no-key screen, chip "Local only" (09). AI provider..., Google, Save: the failed conversation
returns in place of the new one, with the typed question (10). Conversations, Open (11, 12). Enter
then Escape: "Stopped. Changes taken back." with the question back and no Send again (13), so the
earlier route's Send again step was left out, as it missed there. Send: the reply names v09, then
v02 (14). Control+I closes and reopens the panel with focus in the composer (15, 16). "What are
their names?" took under 30 seconds and two steps, Query data and Style. The reply gives Hannah
Weiss, James Carter, Ben Adler, Priya Nair and Seun Okoro, each against the right id in the file
(17, 18). Eight model calls.

The earlier pass's "Selected 0 nodes" line did not appear. Its second scrollbar with the steps list
open did not either, but this run's list held two steps where that one held seven, so the route did
not reach the same state and neither can be called fixed from this walk.

### Send again after moving to Google (T90A/touched-30, 6 screenshots)

Replayed to the same port difference at step 2, then walked by hand. Failure, model label, Google,
key, Save (04), then Send again rather than Enter. It goes to Google and the composer clears (05,
"Sending to Google" still showing at 25 seconds with no step yet); the failed turn has lost its Send
again. The reply came within the next 25 seconds and names v09 at 555-0109, then v02 (06). Four
model calls.

### Settings, Privacy (T90A/touched-42, the whole of detour 1)

Replayed: all 19 steps matched the earlier walk, exit 0, so that walk's account of them stands. On
the fixed screen, with Google saved, "Where your data goes" reads "Files you open: read on this
computer. Only what the assistant reads from them is sent." and "Assistant: Your messages and what
the assistant reads from the graph (column names, node ids, labels and values) go straight to
Google. Google charges your key." (18). The route ends mid-run at "Sending to Google", 3 steps
(20); the session ended there.

## Answer key against the screen

No mismatch. The failure's wording, Send again, the question returning, the model label as a way on,
fifteen steps and the disclosure wording all held. All three first replies from Google named v09 by id,
two of them with v02 after it; the key accepts ids and any names given. They ranked by closeness and
carried a phone number, as the key says.

## Defects

None crashes, blocks the task or spoils its grading. Severity 0 to 4 as in the answer key.

New on this pass: none.

Seen again, unchanged:

| Severity | Route | Defect | Screenshot |
| --- | --- | --- | --- |
| 2 | success, touched-26, touched-30 | The Select step moves the camera and cuts nodes off at the left and bottom of the canvas | T90A/success/14.png, T90A/touched-30/06.png |
| 2 | success, touched-26, touched-30 | "Computed Reach" and step Reach against Closeness in the key card, inspector and reply | T90A/success/15.png |
| 2 | touched-26 | Closing the conversations list replays each earlier failure as a notice, three at once | T90A/touched-26/07.png |
| 2 | touched-26 | Send again stacks a duplicate question and failure each time | T90A/touched-26/05.png |
| 2 | touched-26 | Forget key has no confirmation or notice | T90A/touched-26/08.png |
| 1 | touched-26 | After Forget key and Save, New conversation is undone and the failed conversation returns | T90A/touched-26/10.png |
| 1 | touched-26 | "Stopped. Changes taken back." when nothing had changed | T90A/touched-26/13.png |
| 1 | success, touched-30 | With a selection the placeholder still reads "Ask about this graph" over the scope "Selection 1" | T90A/success/14.png |
| 1 | touched-42 | The whole page sits 1 px higher after some focus moves | T90A/touched-42/18.png |
