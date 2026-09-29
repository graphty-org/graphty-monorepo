# First-click test: Nadia, level-1 alert reviewer

Participant: Nadia, transaction monitoring analyst (study/personas/alert-reviewer.md). No graph
tools before this; works in a case system and a spreadsheet. Each prompt was answered by looking
at one still screen only, then marked against the target afterwards. Answers were not changed
after marking. Confidence is 1 (pure guess) to 7 (certain).

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct |
|---|---|---|---|---|
| fc-1 Picture for the paper | Les Miserables, at rest | The three-line menu button, top left | 4 | yes |
| fc-2 See how the bridges calculation was set up | Les Miserables, at rest | "Bridges ... done" under Results, right panel | 5 | yes |
| fc-3 Rank the characters a second way | Les Miserables, at rest | The "..." at the top right of the table | 2 | no |
| fc-4 Recolor group 2 or 3 | Les Miserables, at rest | The orange swatch next to "2" in the Group color box | 5 | yes |
| fc-5 Get back a cleared selection | Les Miserables, at rest | Ctrl+Z (there is no undo button I can see) | 3 | no |
| fc-6 What is painting Valjean | Les Miserables, Valjean selected | "Group color  color" under Appearance | 5 | yes |
| fc-7 Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 4 | yes |
| fc-8 Bring in next month's file | Transfers | "Change..." after "Loaded: transfers-2026-03.csv" | 4 | no |
| fc-9 Accounts taking in far more than they send | Transfers | The "Table" strip at the bottom | 3 | no |
| fc-10 Cheapest route, bigger transfer costs more | Transfers | The route-looking icon on the floating toolbar (second one) | 4 | yes |
| fc-11 Has anything left the computer | Transfers | "Nothing has been sent from this project" under the project name | 6 | yes |
| fc-12 Recolor Ribosome or Spliceosome | Protein interactions | The light blue swatch next to Ribosome in the legend | 5 | yes |
| fc-13 Bring in the lab's colors-and-sizes file | Protein interactions | The "+" next to Style stack | 3 | no |
| fc-14 How Ribosome differs from the rest | Protein interactions | "Ribosome" in the legend | 3 | yes |

Score: 9 of 14.

## What I was thinking

**fc-1.** I'd just screenshot it, honestly. That's what goes in the alert file. If I have to find
a button, it's the menu, top left, because that's where Save and Export always are.

**fc-2.** It says Bridges, it says done. Clicking the thing is the obvious move. I'd expect it to
open and show me the settings, like opening an old alert shows me the scenario.

**fc-3.** I don't know what "a second way" means in here. In a spreadsheet I'd add a column. The
table is sorted by degree, so I went to the three dots over the table hoping for "add column". The
lightning bolt didn't say anything to me; no label, I don't click icons I can't read. I didn't
notice the + on Results was for running new things -- I thought Results was a list of what was
already done.

**fc-4.** The little color squares in the box. That's a legend; you click the color.

**fc-5.** Ctrl+Z. I do it fifty times a day. I didn't see anything on this screen that said
"selection" or "history". If Ctrl+Z undid something else instead I'd be annoyed, and I wouldn't
know whether I'd just changed the data or only the view.

**fc-6.** There's a section called Appearance with "Group color" in it and he's orange, which is
group 2. So that row.

**fc-7.** The number is right there, 0.57, under Results. I'd click that row. I'd also want it to
tell me in words how it was worked out, because QA will ask.

**fc-8.** "Loaded: transfers-2026-03.csv ... Change..." -- that looks exactly like "swap the
file". I'd click Change and pick the April file. I did not think about the project name or the
Data button on the left; Change is literally next to the file name.

**fc-9.** In my world that's money in versus money out per account, which is a spreadsheet
question. I'd open the table and look for columns to sort. Nothing on the graph side said "in" or
"out" or "amount". It even says "amount not used yet" up in Statistics, which made me think the
app doesn't know about the money at all.

**fc-10.** The second icon on the toolbar looks like a route between two points. That's my guess.
"Cheapest where bigger counts as more expensive" -- I'd expect to be asked about the amount after
I click. Not sure.

**fc-11.** It literally says "Nothing has been sent from this project" with a lock. That's the
answer I'd screenshot and send IT. The left side also says "Assistant Off. Nothing is sent."
which agrees.

**fc-12.** Same as the groups: click the blue square next to Ribosome.

**fc-13.** A colors-and-sizes file sounds like styling, and the Style stack has a +. I'd expect
"import" to be in there. Could also be the menu. Low confidence.

**fc-14.** Click Ribosome in the legend and hope it highlights them. After that I'd want a table
comparing them to everyone else, but I don't know where that is. This isn't a question I'd ever
get asked.

## Things that tripped me

- Unlabeled icons on the floating toolbar. I clicked the one that looked like a route; I never
  once considered the lightning bolt.
- The + on Results. I read Results as "history", not "run something new".
- No visible undo or "previous selection". Ctrl+Z is all I have.
- The "Change..." link next to the loaded file name reads as "replace the file", which is what I
  wanted for next month's data.
- Money in versus money out is my bread and butter, and nothing on the transfers screen mentions
  amounts except to say they are "not used yet".
