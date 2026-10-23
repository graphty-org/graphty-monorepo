# Grade: session r3-s14 -- Elena (tier 1 graduate), Les Miserables (T22 B), point out every tie of 10 or more shared chapters

**Grade: SD** (success after a detour). The last screen (`06.png`) shows exactly the end state the
answer key asks for: the line under the find box reads "13 edges selected" under the rule
"=shared_chapters >= `10`", the inspector header reads "13 edges selected" with Summary "Edges 13",
the Selection layer row reads 13, and the "Selected edges" table lists the 13 ties with their
shared_chapters, row for row the key's list (MmeMagloire -- Myriel 10 through Bossuet -- Enjolras
10). The 13 ties are drawn with thick blue bands; all 77 characters and every other tie are still
drawn (the PageRank row still reads 77), and no filter step exists (`work.json`: `steps` empty at
start and end, `gone` empty, runs and layers unchanged). Elena gave the count 13. It is SD, not S,
because she reached the rule only after two moves that did not lead to it: a bare value search
("10") and a spreadsheet-style condition (">=10") that got "No match". The key lists "a wrong
comparison corrected" as a detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900. Start: the lesmis-ranked setup (PageRank run, color and size by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes. Every step printed its screenshot
(01 to 06), and the session ended cleanly.

## The answer against the key

- **Marked ties (right).** `06.png`: 13 blue bands on the full drawing; the table's 13 rows match
  the key's 13 ties and values.
- **Nothing taken off the drawing (right).** All 77 characters drawn; no filter step, nothing
  removed (`work.json`).
- **Count (right).** "There are 13 ties of 10 or more shared chapters", read from the line under
  the box and the table.
- **Not a wrong answer.** Not `hid-the-rest`, not `not-marked`, not `read-wrong` (she did not use
  the example's 16), not `false-done`.

## Measures

- **Route:** a rule in the find box. "10" as a value search (`02.png`: Edges 2, both exactly 10,
  and a Values row "Select where shared_chapters is 1..." cut off); hover on that row (`03.png`:
  tooltip "Select where shared_chapters is 10 (2)", equality only); ">=10" (`04.png`: 'No match for
  ">=10". To select by a value, type a rule such as =shared_chapters > `16`'); the rule retyped from
  that example with Control+a, "=shared_chapters >= `10`" (`05.png`: "Rule: press Enter to select
  matches"); Enter (`06.png`).
- **Typed "=" unprompted:** no. She copied it from the "No match" hint, with the backticks.
- **Copied the hint:** yes, adapting "> `16`" to ">= `10`".
- **Where she looked for the column name:** the find box's own results for "10"
  (`shared_chapters: 10` under each tie), then the hint.
- **Where she looked for a "select by condition" dialog:** nowhere else; the find box was her first
  and only place. The equality-only "Select where ... is 10" row is where she hoped to find it.
- **Steps:** 5 (type 10, hover, type >=10, retype the rule, Enter) against the success path's 3.
- **Wrong turns:** 2 -- the bare "10" value search (equality only, off the path to a condition)
  and ">=10" (No match). The hover is a check on the cut-off row, not counted as a separate wrong
  turn.
- **Habit check:** her first move went to the find box, a place her history names, and it did
  lead on to the task (through the hint two moves later); not a broken habit.
- **False "done":** none. "13 ties ... all shown in blue on the drawing, with nothing taken off it"
  is true on `06.png`. truth-on-screen: holds.
- **Remark outside the question:** she guessed the big dark node is "the character everybody spends
  the most chapters with", reading PageRank size as tie strength, and said so as a guess. Her
  Slack line ("mostly around Valjean and the students") is consistent with the table (Valjean is in
  5 of the 13 ties). Not graded.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Lost earlier styling:** no. PageRank color and size unchanged.
- **Build-decided:** no. **Void:** no.
- **Leak check:** `leaks.json` lists no transcripts and 0 calls, the check's "no transcript found"
  outcome, as in the other round 3 sessions; not a clean verdict.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind        | Problem | Evidence |
| --- | -------- | ----------- | ------- | -------- |
| 1   | 2        | wording     | ">=10", the way a spreadsheet user writes a condition, gets "No match" and a generic example with a different number and backticks, not the participant's own condition made into a rule. "shared_chapters >= 10" would have been offered as a ready row to take; a condition without the column name gets nothing to take, so she had to select the text and retype the rule (one extra step), and said she would never have guessed the "=" or the backticks. | `04.png`; debrief: "I'd never have guessed the "=" in front or the little backticks around the number -- I just copied them" |
| 2   | 2        | discoverability | A number typed in the find box offers only equality: the Values row "Select where shared_chapters is 10 (2)", with no "10 or more" choice. The row is cut off at "is 1...", so whether it meant 10 or more could only be learned by hovering. | `02.png`, `03.png`; debrief: "the cut-off ... row looked like it might be "10 or more" until I hovered it" |
| 3   | 1        | feedback    | An accepted rule shows only "Rule: press Enter to select matches", with no count, so she could not tell whether the rule was right until she pressed Enter. | `05.png`; debrief: "it only said "press Enter", with no count, so I didn't know if it was right until I pressed it" |
| 4   | 1        | legend      | The size key reads only "Size: PageRank" with its range; she did not know what PageRank means and guessed the largest node was the one with the most shared chapters. A guess she labeled as one, outside the task's question. | `06.png`; transcript step 5: "I'm guessing; the little box says the size is "PageRank", whatever that is" |
