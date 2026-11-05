# Targeted re-pilot of tier 6 task T90A: getting the Assistant going on volunteers.graphml

Build 3549e11129 from .study-builds/tier6-r1d1-3549e11129, 1440 x 900, started empty on every walk.
Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T90A/ (shortened to
`T90A/` below). The data stayed the 24 volunteers and 63 edges from volunteers.graphml on every walk.

Result: reached. Nothing crashed, nothing blocked the task, and nothing seen would spoil its grading.
Nothing asked for was skipped. This pass walks the pointer success path and the routes the fixes
touched that belong to T90A; a keyboard walk was not asked for.

## Routes walked

### Success path by pointer (T90A/success)

Replayed from the earlier walk: steps 1 to 7 matched. Step 8 differs only in the port inside the
expected browser error for the blocked OpenAI call, so the rest was walked by hand.

Open a file, volunteers.graphml; Assistant; AI provider... (04: Google, Gemini 3.8 Flash, the
disclosure above Save); Provider, OpenAI; API key, typed the OpenAI key; Save; typed the question,
Enter (09: "Sending to OpenAI", Stop Esc). About ten seconds on: "Could not reach OpenAI: the
connection failed. Nothing changed." with Send again, and the question back in the composer (10).
The model label, tooltip "Change provider or model" (11, 12). Provider, Google, API key, the Google
key, Save (13: the failure's Send again and the question are still there, the label reads Gemini
3.8 Flash, the chip "Sends to Google"). Enter (14): the reply names v09 (phone 555-0109), by
closeness, and the inspector shows v09 as Hannah Weiss. The steps read Reach, Query data, Select
(15). Fifteen steps, as the answer key says. Four model calls.

### Send again twice, then the rest of detour 3 (T90A/touched-26, 20 screenshots)

Send again twice (05): three questions and three identical failures; only the newest failure keeps
Send again, and the question stays in the composer. The conversations list opens (06); closing it
replays the three failures as notices (printed by the tool on the step to 07). New conversation keeps
the typed question (07). Settings, AI provider, Forget key, Done: back to the no-key screen, chip
"Local only" (09). AI provider..., Google, Save: the failed conversation returns in place of the new
one, with the typed question (10). Conversations, Open (12). Enter then Escape: "Stopped. Changes
taken back." with the question back and no Send again (14), so the route's recorded Send again step
missed; Send works and the reply names v09 and v02 (15). Control+I closes and reopens the panel (16,
17). "What are their names?" took between 20 and 50 seconds and 7 steps; the reply names Hannah Weiss, James
Carter, Ben Adler, Priya Nair and Seun Okoro (19). Thirteen model calls.

### The names question again (T90A/touched-26-names, 10 screenshots)

A short extra session to separate two clicks that touched-26 batched in one step. Straight to Google
(02). A message typed and entered while the first run was still going stayed in the composer unsent (04). Sent
after it, the reply names Hannah Weiss and Priya Nair with a "No matches." row under it (05). A longer
request gave 15 steps, five right names and 5 nodes selected (09). "and 8 more" under the change lines
opens the steps list (10).

### Send again after moving to Google (T90A/touched-30)

Failure, model label, Google, key, Save, then Send again rather than Enter (04, 05). It goes to
Google, the composer clears, the failed turn loses its Send again, and the reply names v09 at
555-0109. Four model calls.

### Settings, Privacy (T90A/touched-42, the whole of detour 1)

Replayed: all 19 steps matched the earlier walk, so that walk's account of them stands. On the fixed
screen, with Google saved, "Where your data goes" now reads "Files you open: read on this computer.
Only what the assistant reads from them is sent." and "Assistant: Your messages and what the
assistant reads from the graph (column names, node ids, labels and values) go straight to Google.
Google charges your key." (18). On the start screen, with no provider, it stays "read on this
computer, never uploaded" and has no AI provider section (03). The route ends mid-run at "Sending to
Google", 4 steps (20), as it did before; the session ended there.

## Answer key against the screen

No mismatch. The failure's wording, Send again, the question returning, the model label as a way on,
fifteen steps and the disclosure wording all held. The success reply named v09 alone, by id; the key
accepts ids and any names given. Replies ranked by closeness, and all carried phone numbers, as the
key says.

## Defects

None crashes, blocks the task or spoils its grading. Severity 0 to 4 as in the answer key.

New on this pass:

| # | Severity | Route | Defect | Screenshot |
| --- | --- | --- | --- | --- |
| 1 | 2 | touched-26, touched-26-names | With the transcript overflowing, opening the steps list makes the whole panel body scroll too: a second scrollbar appears beside the transcript's. In touched-26 the composer and scope line jumped up to y 594 to 650 with blank panel below and the title row scrolled away; in touched-26-names the header and composer shift left 15 px | T90A/touched-26/20.png, T90A/touched-26-names/10.png |
| 2 | 1 | touched-26 | A change line "Selected 0 nodes" is drawn, though `decided.md` says a selection of nothing draws no line | T90A/touched-26/19.png |
| 3 | 1 | touched-26-names | "and 8 more" under the change lines opens the steps list rather than showing the rest of the lines, and the count (8) does not match the steps' (15) | T90A/touched-26-names/09.png, 10.png |
| 4 | 1 | touched-26-names | A warning row "No matches." sits as the last line of a right reply, with nothing saying which lookup it belongs to | T90A/touched-26-names/05.png |

Seen again from the earlier pilot, unchanged:

| Severity | Route | Defect | Screenshot |
| --- | --- | --- | --- |
| 2 | success, touched-26, touched-30 | The Select step moves the camera and cuts nodes off at the left and bottom of the canvas | T90A/success/14.png |
| 2 | success, touched-26, touched-30 | "Computed Reach" and step Reach against Closeness in the key card, inspector and reply | T90A/success/14.png |
| 2 | touched-26 | Closing the conversations list replays each earlier failure as a notice, three at once | T90A/touched-26/07.png |
| 2 | touched-26 | Send again stacks a duplicate question and failure each time | T90A/touched-26/05.png |
| 2 | touched-26 | Forget key has no confirmation or notice | T90A/touched-26/08.png |
| 2 | touched-26-names | Enter during a run does nothing and says nothing; the message waits unsent | T90A/touched-26-names/04.png |
| 1 | touched-26 | After Forget key and Save, New conversation is undone and the failed conversation returns | T90A/touched-26/10.png |
| 1 | touched-26 | "Stopped. Changes taken back." when nothing had changed | T90A/touched-26/14.png |
| 1 | success | With a selection the placeholder still reads "Ask about this graph" over the scope "Selection 1" | T90A/success/14.png |

Fixed since the earlier pilot: Settings, Privacy now names the Assistant and the provider.
