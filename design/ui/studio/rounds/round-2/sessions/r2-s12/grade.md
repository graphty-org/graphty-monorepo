# Grade: session r2-s12 -- Nadia (alert reviewer), names on every dot, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (13.png),
the transcript and a scripted re-run of the session's path on the same build, run twice. No files
were downloaded (the task asks for none).

## Grade: SD (success with difficulty)

- **Success definition met.** The last screenshot shows a label line on the Everything row bound
  to `name` ("Aa Above | Abc name"), character names drawn beside the dots, and the line's count
  statement "77 labels, 7 hidden to avoid overlap". Nadia read the count at step 6 and gave the
  reason in her own words at the end: "The app itself says 7 are hidden 'to avoid overlap', and I
  could not find a way to force them on."
- **Why SD, not S:** five wrong turns, more than the two S allows (listed below). Names were on
  after four clicks; the remaining eight steps went to hunting for a way to show the hidden seven.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (every command did what a person could do; the tool resolved
  each `--click-at` to the control under the pointer).

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 12 after the start (2 to 13) | 4 (pointer path) |
| Steps to names drawn | 5 (steps 2-6) | 4 |
| Wrong turns | 5 | -- |

Wrong turns:

1. Step 3 (03.png): opened the Graph row's Style tab, which has canvas and layout only, no label.
2. Step 8 (08.png): clicked "Above" in the label line, which is plain text; nothing happened.
3. Step 9 (09.png): opened "Label position" ("Aa") looking for an overlap setting; it only places
   the name around the dot.
4. Step 10 (10.png): hovered the "7 hidden" line hoping for an explanation; it is plain text.
5. Step 11 (11.png): reopened the attribute picker ("Abc name") looking for size or "show all".

The zooms (steps 7, 12, 13) are not counted as wrong turns: they were a reasonable test of the
count statement, and step 12 did bring two names back.

## False "done"

None. Nadia's closing answer is accurate about her own picture: "every character's name -- no, not
quite", 70 of 77 shown, 7 hidden. The screen (13.png) agrees.

## Problems

Severity 0-4 (Nielsen). The build defect was reproduced by `rounds/round-2/repro/r2-s12/repro.sh`
(the session's clicks and wheel turns, run twice into `run-1/` and `run-2/`, logs `run-1.log` and
`run-2.log`); `crop.py` stacks the count line of steps 05-09 of both runs into `counts.png`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | behavior | "7 hidden to avoid overlap" says names are missing but offers no way to show them or to see which dots they belong to: not a control, no tooltip, and nothing in the label line (position, attribute picker) touches it. Nadia spent eight steps looking and left saying "If QA asked 'why is that dot unnamed?', I could not answer." Confirmed: the same dead end in round 2 session r2-s01 (Sam, College football). | Steps 6-13; 06.png, 09.png, 10.png, 11.png, 13.png. |
| 2 | 2 | build-defect | Zooming in changes the hidden count in both directions with no visible rule: 7, then 7, then 5, then back to 7, then 8, on the same wheel turns, the same on both runs. Zooming does not reliably make room for names, so the one route a reader finds (zoom in) undoes itself; Nadia: "I zoomed in and it got worse? I don't get the rule." Whether nodes pushed off screen are counted as hidden was not determined. | Steps 7, 12, 13; 07.png (7), 12.png (5), 13.png (7). Repro: `run-1/05.png`-`09.png` and `run-2/05.png`-`09.png`, `counts.png` (7, 7, 5, 7, 8 on both runs). |
| 3 | 2 | behavior | Label lives under the Everything row; the Graph row's Style tab, which is the Style tab a reader sees first, has no label control and no pointer to Everything. Nadia found it by guessing. Confirmed: also round 2 session r2-s01. | Step 3, 03.png; step 4, 04.png. |
| 4 | 2 | behavior | Names that are drawn in the dense middle are tiny and stacked on top of each other, unreadable, while the count reports only 7 hidden; Nadia: as a screenshot for an alert file "it would not hold up for the middle cluster". Unconfirmed as a defect from this session alone; r2-s09 reports names unreadable while the count says otherwise on another dataset. | 06.png, 12.png, 13.png (middle cluster around 600,400). |
| 5 | 1 | behavior | "Aa Above" reads as one control, but only "Aa" is a button; "Above" is inert text beside it. | Steps 8-9, 08.png, 09.png. |
| 6 | 1 | opinion | Reopening the label's attribute ("Abc name") shows only the attribute list again; Nadia expected the label's own settings there (size, "show all"). | Step 11, 11.png. |

What worked, for the record: once on the Everything row, "Label +" was found at once ("Label.
That's it."); the attribute list offered `id` and `name` and she picked `name` without hesitation;
names appeared immediately with the count statement under the line.
