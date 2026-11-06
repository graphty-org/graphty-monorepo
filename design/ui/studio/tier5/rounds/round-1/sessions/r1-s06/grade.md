# Grade: session r1-s06 (task T71B, Tom, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 12 (counted as `tool/steps.mjs` counts, from `route.jsonl`; the answer key's path for T71 B is 9, so 3 over)
Overwhelm: 3 -- the Or group (A and B group colors, Group colors on, the matches table's Group column) -- "right after I pressed Or... ... I didn't know whether I had just put new colours on the lab's file or whether that was only how the filter screen shows things ... for a moment I didn't know if I was building a filter or making groups"
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 30 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 10 and the end-state records agree with the answer key's B values (6 of 11: G01, G03,
G05, G08, G09, G10):

- Top bar: "6 of 11 nodes, 2 of 13 edges"; the Values panel: "Nodes showing 6 of 11", "Edges
  showing 2 of 13", Full graph Nodes 11, Edges 13, so nothing was deleted.
- One filter card in the Data place, on, its outline "telemetry no / A 4 / telemetry no / or B 3 /
  installed 1990 to 1999". The node table (Shown, 6 of 11 nodes) lists G01 Upper Falls, G03 Cedar
  Bend, G05 Old Bridge, G08 Heron Marsh, G09 Lake Inlet, G10 Birch Hollow -- the key's six.
- `data.json`: one filter, a union of branch A (keep `data.telemetry` in [no]) and branch B (add
  `data.installed` between 1990-01-01 and 1999-12-31 23:59:59.999), count 6 of 11; visible nodes
  6, total 11. The style layers are the same before and after (`work.json`); the drawing is back
  to the one default node color (`styles-steps.jsonl`, shot 10).
- Route differs from the key in B's second way in: installed Between 1990 and 1999 instead of
  "before 2000". The task's wording is "installed in the 1990s", and no gauge in the file was
  installed before 1990, so both give the same six: an equal result ("Also success" in the key).
- Reported: "Six gauges are still in the picture: Upper Falls, Cedar Bend, Old Bridge, Heron Marsh,
  Lake Inlet and Birch Hollow. The other five are out of the picture but still in the project." Right,
  and the screen shows it.

## Path and wrong turns

Filters (the canvas toolbar's funnel, which opened the Data place with a new filter's picker open,
standing in for the key's Data and Add filter); `telemetry`; tick no; Or...; `installed`; the
"how to match" select; Between; 1990 in the From box; 1999 in the To box; Done. Success state
reached at step 9 (6 of 11, one card, screenshot 09), confirmed by Done at step 10.

- Wrong turns: none. Every step stayed on a route to the answer; nothing was closed empty, undone
  or removed.
- Step count: the toolbar's Filters button saved one step against the key (one click for Data plus
  Add filter); Between cost two (open the select, pick Between) and a second date box cost two
  more (a click and the typing), with no Enter: 9 - 1 + 4 = 12.

## Follow-up

Present in the transcript. Rating 3. Least sure: right after Or..., when the outline grew an "A"
with a green square and a "B" with an orange square at 0, the column list reopened, the matches
table grew a "Group" column, the header showed "Group colors", "Styled" and "Table", and the dots
turned green; the participant could not tell whether the lab's colors had changed or whether it
was building a filter or making groups. Besides the drawing: the matches table (station names and
installed dates, used to add 4 "no" plus Upper Falls and Lake Inlet = 6) and the counts (no 4, A,
B, "No match 5", top bar "6 of 11") helped most. In the way: B read 3 while only two new gauges
appeared (Old Bridge is in both, and nothing said so), the "Oct 11, 1999" suggestion that covered
part of the To box, and the card still named "telemetry no" in the sidebar.

## Problems

1. Severity 2, behavior. After Or..., the new group B sits at 0 with "Value..." and the picker
   reopens, the preview switches to group colors (Group colors on), and the matches table gains a
   Group column; nothing says this is a second way into the same filter and that the colors exist
   only in the editor's preview. The participant paused here (the follow-up's least-sure moment, a
   selection editor element; r1-s05 on T71 A named the same moment, so for bar 9 it is named by two
   sessions on different halves). Evidence: step 5, screenshot 05; screenshot 10 after Done.
2. Severity 1, behavior. B's count (3) counts Old Bridge, which A already holds, so B adds only
   two gauges to the picture; the outline does not show the overlap, and the participant worked it
   out from the dates. The totals agree (A 4, B 3, No match 5, top bar 6 of 11), so no count is
   wrong. Evidence: step 9, screenshot 09.
3. Severity 1, wording. The card and the workspace header keep the first step's name
   "telemetry no" after the Or group is added ("telemetry no -- Filters 6 of 11"; the sidebar card
   title), so the name does not say the 1990s half is in there. Known in the answer key. Evidence:
   screenshots 09 and 10.
4. Severity 1, behavior. Typing "1999" in the To box opens a suggestion list ("Oct 11, 1999", a
   value from the data) under the box that the participant did not ask for and had to decide to
   ignore. Evidence: step 9, screenshot 09.
5. Severity 1, wording. "installed 1990 to 1999" does not say whether the To year counts in full;
   the participant could only tell from Lake Inlet (October 1999) being in. The stored rule does
   take the whole of 1999 (`data.json`, max 1999-12-31 23:59:59.999). Evidence: step 9,
   screenshots 09 and 10.
6. Severity 0. "telemetry" is the file's column name; the participant read "no" as "does not send
   readings by itself" from knowing the data, not from the product. Not a product problem.

No build defect needed a scripted repro: every problem is screenshot-visible or in the follow-up.
The study tool refused nothing (no FAIL or refusal line in `route.jsonl`; every step code 0, 0
missed).
