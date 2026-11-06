# Grade: session r1-s08 (task T71B, Alex, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 13 (counted in `tool/steps.mjs` units from `route.jsonl`; the answer key's path for T71 B is 9, so 4 over)
Overwhelm: 2 (least sure: the editor right after ticking "no" -- "Condition..." and "Or..." as two bare words with an Except switch and a "..." menu, nothing saying which one means "and"; this is the selection editor)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 27 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 10 and the end-state records agree with the answer key's B values:

- Top bar: "6 of 11 nodes, 2 of 13 edges". The right panel reads Nodes showing 6 of 11, Edges
  showing 2 of 13, Full graph Nodes 11, so nothing was deleted.
- The sidebar's filter card outline: "telemetry no / A 4 / telemetry no / or B 3 / installed 1990
  to 1999".
- `data.json`: one filter card, on, a union of two groups -- A keeps `data.telemetry` in ["no"],
  B adds `data.installed` between 1990-01-01 and 1999-12-31 23:59:59.999 -- count 6 of 11; total
  nodes 11. `work.json` holds the same single filter step and no new style layers.
- The node table's Shown list: G01 Upper Falls, G03 Cedar Bend, G05 Old Bridge, G08 Heron Marsh,
  G09 Lake Inlet, G10 Birch Hollow -- the key's six.
- Reported: "6 gauges are still in the picture", with the five others hidden and the full graph
  still 11. Right, and the screen shows it.

The participant used Between 1990 to 1999 for the second group instead of the key's "before
2000". On this data both match the same three gauges (G01, G05, G09) and the task asked for the
1990s, so this is an equal result on the answer key's path, not a detour.

## Path and wrong turns

Toolbar Filters (one click in place of Data and Add filter), `telemetry`, tick no, Or...,
`installed`, the operator list, Between, the from box and 1990, the to box and 1999, Tab, Done.
Success state reached at step 9 (Done, screenshot 10).

- No wrong turns: the operator list was opened and a choice made in it; nothing was undone,
  closed empty or removed.
- The 4 extra steps: the operator list and Between (2), a click in each date box (2) and a
  second typed year (1), with Tab in place of the key's Enter (0), less one saved by the toolbar's
  Filters button (-1).

## Follow-up

Present in the transcript. Rating 2. Least sure: after ticking "no" (screenshots 04 to 05), the
top of the property pane showed only "Condition..." and "Or...", an Except switch and "..."; the
participant picked Or... because the word matched the sentence but was guessing what Condition...
does. Close second: the Between date boxes (screenshot 08), "A date or a year" to "A date or a
year", with no sign whether "1999" means the whole year. Besides the drawing: the outline's group
counts (A 4, B 3, No match 5) helped most; the top bar's "6 of 11" helped and caught the overlap
(4 + 3 is not 7); the matches strip with its Group column helped confirm Lake Inlet (Oct 1999).
In the way: the "Group colors / Styled / Table" buttons, which the participant avoided for fear
they would change the picture, and the sidebar card still titled "telemetry no -- Editing" while
it held both groups. The drawing was the least useful: small, and the faded dots hard to tell
from the kept ones.

## Problems

1. Severity 2, wording. "Condition..." and "Or..." at the top of the property pane say nothing
   about which adds an "and" step and which adds a second way in; the participant guessed from
   the word. This is the selection editor element named in the follow-up's least-sure answer
   (bar 9 if a second session on another task half names it). Evidence: step 4, screenshots 04
   and 05.
2. Severity 2, behavior. After Or... the card keeps its first step's name: the sidebar card
   ("telemetry no -- Editing", then "telemetry no"), and the workspace title ("telemetry no --
   Filters 6 of 11") all read as if only the first group applied; the participant double-checked
   that the B group had not been lost and said the name would mislead on return. Evidence: steps
   4-9, screenshots 05, 09 and 10; known in the answer key's final-screen note.
3. Severity 2, wording. The Between date boxes ("A date or a year" to "A date or a year") do not
   say that a bare year as the upper bound takes the whole year; the participant learned it only
   from Lake Inlet (Oct 1999) appearing in B's count. A person without the table to check could
   type 2000 and get a different set. Evidence: steps 7-8, screenshots 08 and 09.
4. Severity 1, wording. The workspace header's "Group colors / Styled / Table" buttons give no
   sign of whether they change the result or only the preview, so the participant avoided them and
   looked twice. Evidence: screenshots 02 to 09; the follow-up answer.
5. Severity 1, behavior. Group counts overlap without saying so: A 4 and or B 3 sum to 7 while the
   card holds 6 (G05 is in both); the top bar resolves it, but a reader adding the group counts
   would misreport. Evidence: screenshots 09 and 10.
6. Severity 1, behavior. In the preview, the nodes outside the choice are pale lavender against
   small colored dots; the participant found them hard to tell from the kept ones and relied on
   the counts and the table instead. Evidence: screenshot 09; the follow-up answer.

No build defect needed a scripted repro: problem 2 is known in the answer key and the rest are
screenshot-visible wording or presentation findings. The study tool refused nothing (every step
in `route.jsonl` returned code 0 with nothing missed).
