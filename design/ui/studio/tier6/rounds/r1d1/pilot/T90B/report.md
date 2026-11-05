# Pilot: T90 B, getting the Assistant going on sources.graphml (targeted re-pilot)

Build 3549e11129, served from .study-builds/tier6-r1d1-3549e11129. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T90B/ (each path below is
relative to that folder).

Result: the task reaches its end by pointer, and nothing crashed, blocked the task or would spoil its
grade. The network stayed 24 nodes and 59 edges from sources.graphml, with nothing selected or
filtered at the end (success/data.json). Both sessions were ended and their key checks were clean.

This pass walks the pointer success path and the one route on the fix list that belongs to this task,
Settings then Privacy. No other detour and no keyboard walk was asked for, so the earlier report
still stands for those.

## Routes walked

| Folder   | Route                                                                                    | Outcome                                  |
| -------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| success  | Pointer: open the file, Assistant, OpenAI key, failure, model label, Google key, reply    | Reached, success/17.png                  |
| detour-1 | Settings on the start screen; Settings in the workspace; key then Done; Escape; Save; Privacy | Whole route matched the earlier walk |

## Pointer success path

Replayed from the earlier walk. Steps 1 to 8 matched. The replay stopped at step 9 only because the
expected OpenAI console errors name the session's own port (45443 then, 46259 now); the screen was
the same, and the rest was walked by hand.

1. Open a file, sources.graphml; Assistant; AI provider... (success/02.png to 04.png).
2. Provider, OpenAI; API key typed; Save. The status bar turned to "Sends to OpenAI" (05 to 09).
3. The question and Enter: "Could not reach OpenAI: the connection failed. Nothing changed." with
   Send again, and the question back in the composer (11). The browser's call to api.openai.com was
   refused by CORS twice, which is the failure this task plans.
4. The GPT-4o label, tooltip "Change provider or model", reopened the section (12, 13).
5. Provider, Google; key typed; Save. Label "Gemini 3.8 Flash", "Sends to Google", the question still
   in the composer (14).
6. Enter: "Sending to Google", 8 steps, then the reply after about 35 seconds (16, 17). 9 model calls.
7. The steps list, Open run and Values all open (18, 19, 20).

The reply named s18 (pgreene@mail.example) first, then s06 (mlee@mail.example) and s08
(epark@mail.example) as the most connected on the record. Recomputed from the file: s18 has degree
7, tied with s23, and s06 and s08 have degree 6 with on_record true. One clause is wrong: it says s18
ranks highest in closeness, where s20 Silverline Media does (total distance 50 against 52), as the
answer key's reference also says.

## Settings, Privacy (detour-1)

All 14 steps matched the earlier walk, and every screen below was looked at.

- No provider saved: Privacy is unchanged, "Files you open: read on this computer, never uploaded."
  and "Usage data: off. Nothing is sent.", with "Local only" in the status bar (detour-1/07.png).
- Google saved: "Files you open: read on this computer. Only what the assistant reads from them is
  sent.", then "Assistant: Your messages and what the assistant reads from the graph (column names,
  node ids, labels and values) go straight to Google. Google charges your key.", and "Usage data:
  off." with "Sends to Google" in the status bar (detour-1/14.png). A reader answering the follow-up
  from this page now gets the right answer, and it agrees with the AI provider section.
- Done returns to the Assistant with focus left off the composer, and the conversation screen and
  status bar unchanged (detour-1/15.png).

## Mismatches with the answer key

- The reply's "ranking highest in degree and closeness" for s18 differs from the key's reference
  (top by closeness: s20). It is the model's prose, and the key takes any names or ids the reply
  gave, so the grade does not change. success/17.png

Everything else on the route matched: the failure's wording, the question returning to the composer,
the way out by the model label, the disclosure naming the provider and who pays, and Enter carrying
the question once Google is saved.

## Defects

None that crashes, blocks the task or would spoil its grade.
