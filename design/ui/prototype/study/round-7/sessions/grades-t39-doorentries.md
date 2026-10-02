# Round 7 grades: t39 on door entries, "leave a note on a whole chain"

The task: in the door entries graph (people badging into buildings), someone has already worked
out a chain from Ana Ruiz through building B1 to Priya Nair. The participant leaves a reminder on
that chain as a whole -- not on either person or the building -- saying it needs checking against
the badge logs.

What counts as success: the "Ana Ruiz to Priya Nair" row in the left list is selected, so the
right panel describes the path; Add note (or N) opens the writing box in Notes with the single
chip "Ana Ruiz to Priya Nair"; and the note is saved. Success with difficulty is starting a note
on Ana Ruiz, B1 or the graph first and then correcting the subject. Failure is a note attached to
a person, the building or the graph.

The designed path is: the door entries graph at rest with the path colored -> the path's own
inspector (members in order, its own Notes section) -> Add note -> type -> Save.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success | **success** | Clicked the path row first, then Add note in the path's inspector. Last render shows the saved note "Check against badge logs" at the top of Notes with the one chip "Ana Ruiz to Priya Nair", and the path's inspector reading "1 note". No wrong turn in the interface. |
| Supply chain analyst | success | **success** | The same three steps, same end: the saved note carries only the path's chip, and the path's inspector counts "1 note". Read the neighboring "Ana Ruiz . person" and "B1 . building" chips as proof the note was on the chain and not on its members. |
| Knowledge engineer | success | **gave up** (on saving) | Picked the right subject with no wrong turn: the path row, then Add note, and the draft carries one chip, "Ana Ruiz to Priya Nair". But the note was never written or saved. The last render shows an empty box and a disabled Save, and the path's inspector still says "No notes". She stopped because the click-through tool would not take her typing, not because of anything on screen. |

**Tally: 2 success, 0 success with difficulty, 0 failure, 1 gave up (3 sessions).**

Nobody attached the note to a person, the building or the graph. All 3 went straight to the path
row; nobody opened Add note from the graph's inspector or a member's. The knowledge engineer said
why she skipped the graph's inspector at rest: "its Add note would be a note on the graph."

The one "gave up" is a study artifact. All three sessions first tried a typing step the
click-through tool does not support, and it quietly left the box empty. Two found that typing key
by key works; the knowledge engineer did not. Nothing in her session counts against the design.
It does mean the "saved note shows up on the path" half of the success bar rests on 2 sessions,
not 3.

## What the sessions show

Counts are out of 3.

1. **Opening Add note on the path turns off the path's coloring.** 3 of 3 noticed and were
   unsettled by it. The orange path disappears from the canvas and the overlay changes to
   "Nothing is colored or sized by a row" (renders 03 and 07 in every session), so the thing
   being annotated vanishes while the note is written. "Did I just switch off the path?"
   (supply chain analyst); "Did my note break the coloring?" (cybersecurity analyst); "the kind
   of silent change I distrust" (knowledge engineer). It cost each of them a point on the ease
   rating (6 of 7 from all three), and the cybersecurity analyst said she would go back and check,
   at a cost in time. Nielsen severity 2 (minor): nobody was blocked or misled about where the
   note went, but every participant doubted their own action. The likely cause is that switching
   the left panel to Notes drops the left list's selection, and the canvas coloring follows the
   left list's selection. Coloring should follow what is being annotated, or at least not change
   when the Notes panel opens.

2. **The path's chip has no type word.** 2 of 3 (cybersecurity analyst, supply chain analyst).
   Every other chip in Notes reads "<name> . <kind>" ("Ana Ruiz . person", "B1 . building") or has
   an edge arrow, while the path's chip shows only an orange dot and the name. "In six months I
   won't know that dot means 'a saved path' and not 'something colored orange'." Severity 1
   (cosmetic) today; it grows once there are several paths or several colored rows. Fix: the same
   "<name> . path" form the other chips use.

3. **The path's name is cut off in the left list.** 2 of 3 (supply chain analyst, knowledge
   engineer): "Ana Ruiz to Pr...". Harmless with one path; ambiguous when several paths start at
   Ana Ruiz. Severity 1.

4. **"Made with: All at their defaults" does not say whether the path was weighted.** 1 of 3
   (knowledge engineer), outside this task. For a "could have met" claim, hop count versus weight
   matters and should be readable without opening All options. Single voice; carry it forward
   and do not act on it alone.

5. **Notes need a way out of the tool.** 3 of 3 asked, unprompted, how they would export notes
   with what they are attached to (a spreadsheet for a weekly meeting, case notes, a ticket). The
   knowledge engineer also asked what happens to a path's note when the path is recomputed and
   comes out different. Outside this task's success bar, but unanimous.

## What worked

- The path is an object of its own: selecting it gives an inspector with From, To, Via, the
  members in path order (start, hop 1, end) and its own Notes section. All 3 read that inspector
  as "the chain" and put the note there with no search.
- The writing box opens already tagged with exactly one chip, the path, and with the cursor in
  the box (2 of 2 who typed noticed they did not have to click it).
- The older notes beside the draft, on a person, a building and an edge, made the difference
  between "a note on the chain" and "a note on its members" visible. All 3 used them to confirm
  they had the right subject.
- After saving, the path's inspector changes from "No notes" to "1 note" (2 of 2 who saved), which
  closed the loop.
