# Grade: session r3-s13 -- Grace (tier 1 graduate), bus stops (T22 A), point out every link of 10 minutes or more

**Grade: S** (success). The last screen (`08.png`) shows exactly the end state the answer key
asks for: the line under the find box reads "3 edges selected" under the rule "=minutes >= `10`",
the inspector header "3 edges selected" with Summary "Edges 3", the Selection layer row reads 3,
and the "Selected edges" table lists School -> Harbor 12, Depot -> Station 15, Station -> Harbor
14. The three links are drawn with blue bands on the full map; all 10 stops and every other link
are still drawn, and no filter step exists (`work.json`: `steps` empty at start and end, `gone`
empty, layers and runs unchanged). Grace gave the count 3 and named the three links correctly.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the bus-stops setup (PageRank run, color and size by PageRank).
Tool commit `acf3894e2c56`, no uncommitted changes. Every step printed its screenshot (01 to 08).

**The session record is incomplete.** `transcript.md` holds only the "End" section and the
in-character debrief; the start command, the per-step commands and the participant's narration
are missing (`session.log` is empty too). The route below is read from the eight screenshots, so
whether the corrected rule was taken with Enter or with a click on its row is not known. This
does not void the session: the tool did what was asked at every step and the end state is on the
last screenshot, which is what the grade rests on.

## The answer against the key

- **Marked links (right).** `08.png`: three blue bands on the full drawing; the table's three rows
  match the key row for row.
- **Nothing taken off the drawing (right).** All 10 stops and the grey links still drawn; the
  PageRank row still reads 10; no filter step, nothing removed (`work.json`).
- **Count (right).** "Three links take 10 minutes or more", with the three named links and
  minutes, matching the table.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not `read-wrong`, not `false-done`.

## Measures

- **Route:** a rule in the find box, through the no-"=" route and then the bare-number correction.
  Grace typed "minutes" (`02.png`: "Start with = to select by a value:" over the marked row
  "=minutes" / "Select its matches"), then typed "=minutes >= 10" (`03.png`: the red line "Put
  numbers in backticks:" over the marked row "=minutes >= `10`" / "Select its matches"), then took
  that row (`04.png`: 3 edges selected, box rewritten to "=minutes >= `10`").
- **Typed "=" unprompted:** no. She typed it after the hint under "minutes" told her to.
- **Where she looked for the column name:** she typed "minutes" from the prompt's own word.
- **Where she looked for a "select by condition" dialog:** nowhere; the find box was her first
  place.
- **Steps:** 3 steps to the success state (`02` to `04`), the same as the success path. Then 4
  more steps to check the count: the Data page (`05.png`), the "minutes" attribute's summary
  (`06.png`, Range 2 to 15, no count over a value), a rule "=minutes >= `0`" selecting all 17 edges
  to read every row by eye (`07.png`), and the rule for 10 again (`08.png`). 7 steps in all.
- **Wrong turns:** 0. The "minutes" probe and the backtick correction cost no step against the
  success path; the 4 checking steps moved away from the goal only to confirm it and ended back on
  the right state.
- **Retyped after the backtick refusal:** no; she took the offered corrected row.
- **False "done":** none. "They are marked thick and blue on the full map; no stop or link was
  removed" is true on `08.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Lost earlier styling:** no. The PageRank color and size are unchanged.
- **Build-decided:** no. **Void:** no.
- **Leak check:** `leaks.json` lists no transcripts and 0 calls, which is the check's "no transcript
  found" outcome, not a clean verdict; the same as every other round 3 session folder checked
  (r3-s01, r3-s12, r3-s14).
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | wording         | The bare number gets a red line "Put numbers in backticks:", worded as a refusal and naming a key a spreadsheet user does not know. It worked only because the corrected rule sat under it as an option to take. | `03.png`; debrief: "a programmer's word and a key I rarely use ... If it had not, I would not have known what a backtick is" |
| 2   | 2        | trust           | Nothing on screen let her confirm that the 3 selected links are all the links at 10 or more: the column's summary gives the range (2 to 15) and distinct values but no count over a value, so she selected every link ("=minutes >= `0`") and read all 17 rows by eye. 4 extra steps after the task was done. | `05.png` to `08.png`; debrief: "To check the count I had to select every link with a trick" |
| 3   | 1        | persistence     | She was unsure the blue marking survives a click elsewhere or a hand-off to a colleague, and did not find how to turn it into a lasting color. Opinion only, held one level down; the task does not ask for a lasting style. | debrief: "I am not sure it stays if I click somewhere else or hand the map to my colleague" |
| 4   | 0        | session-record  | `transcript.md` has no start, step commands or narration, and `session.log` is empty; the route is reconstructed from screenshots only. A record defect of the run, not of the app. | `transcript.md` (1144 bytes, "End" section only) |
