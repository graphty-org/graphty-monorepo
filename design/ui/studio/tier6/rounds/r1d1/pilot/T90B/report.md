# Pilot: T90 B, getting the Assistant going on sources.graphml (targeted re-pilot)

Build 48879618c4, served from .study-builds/tier6-r1d1-48879618c4. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T90B/ (each path below is
relative to that folder). The folders success and detour-1 there hold the walks of the earlier build
3549e11129; they are the routes these walks replayed.

Result: the task reaches its end by pointer, and nothing crashed, blocked the task or would spoil its
grade. The network stayed 24 nodes and 59 edges from sources.graphml, all visible, with nothing
selected or filtered at the end of both walks (success-2/data.json, touched-43/data.json). Both
sessions were ended and their key checks found nothing.

This pass walks the pointer success path and the one route on the fix list that belongs to this task,
Settings then Privacy. No other detour and no keyboard walk was asked for, so the first report of
this task still stands for those.

## Routes walked

| Folder     | Route                                                                                         | Outcome                             |
| ---------- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| success-2  | Pointer: open the file, Assistant, OpenAI key, failure, model label, Google key, reply         | Reached, success-2/17.png           |
| touched-43 | Settings on the start screen; Settings in the workspace; key then Done; Escape; Save; Privacy  | All 14 steps matched the earlier walk |

## Pointer success path

Replayed from the earlier walk. Steps 1 to 8 matched. The replay stopped at step 9 only because the
expected OpenAI console errors name the session's own port (46259 then, 39665 now); the screen was
the same, and the rest was walked by hand.

1. Open a file, sources.graphml; Assistant; AI provider... (success-2/02.png to 04.png).
2. Provider, OpenAI; API key typed; Save. The status bar turned to "Sends to OpenAI" (05 to 09).
3. The question and Enter: "Sending to OpenAI" (10), then "Could not reach OpenAI: the connection
   failed. Nothing changed." with Send again, and the question back in the composer (11). The
   browser's call to api.openai.com was refused by CORS twice, which is the failure this task plans.
4. The GPT-4o label, tooltip "Change provider or model", reopened the section with the disclosure
   naming OpenAI (12, 13).
5. Provider, Google; key typed; Save. Label "Gemini 3.8 Flash", "Sends to Google", the question still
   in the composer (14).
6. Enter: "Sending to Google" with a growing step count, then the reply, 8 steps (15, 17). 9 model
   calls. The earlier failure row loses its Send again once the new turn starts.
7. The steps list, Open run and Values all open (18, 19, 20).

The reply named Paula Greene and Victor Szabo as the most central, both off the record, then Marcus
Lee or Eileen Park as the most connected on the record. Recomputed from the file: Paula Greene has
degree 7, tied highest with Owen Clarke; Victor Szabo has the highest betweenness of any person
(s20, s12 and s01, ahead of him, are organizations); Marcus Lee and Eileen Park have degree 6, the
highest with on_record true. The reply is right on all four.

## Settings, Privacy (touched-43)

All 14 steps matched the earlier walk, and the screens that carry the fix were looked at.

- No provider saved: Privacy reads "Files you open: read on this computer, never uploaded." and
  "Usage data: off. Nothing is sent.", with "Local only" in the status bar (touched-43/07.png).
- Google saved: "Files you open: read on this computer. Only what the assistant reads from them is
  sent.", then "Assistant: Your messages and what the assistant reads from the graph (column names,
  node ids, labels and values) go straight to Google. Google charges your key.", and "Usage data:
  off." with "Sends to Google" in the status bar (touched-43/14.png). A reader answering the
  follow-up from this page gets the right answer, and it agrees with the AI provider section.
- Done returns to the Assistant, with the conversation screen and status bar unchanged
  (touched-43/15.png).

The start of this session printed "the app did not finish loading in 60 s". That line is the tool's:
its page open waits for the network to go quiet, and the network did not go quiet for 60 seconds on
this start. Which request kept it busy is not recorded. The app itself had loaded: touched-43/01.png
is the complete start screen, and every later step matched. The success-2 start did not print it.

## Mismatches with the answer key

None. The failure's wording, the question returning to the composer, the way out by the model label,
the disclosure naming the provider and who pays, and Enter carrying the question once Google is saved
all matched. The key takes any names or ids the reply gave.

## Defects

None that crashes, blocks the task or would spoil its grade.
