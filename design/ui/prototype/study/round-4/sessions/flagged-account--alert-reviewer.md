# Session: a flagged account -- level-1 alert reviewer

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it
or refer it, and save what you would attach as evidence."
Material: the task's nine frames of the alert triage screens, as a participant sees them
(shots/tasks/flagged-account/01 to 09: the opened project, the account found, the Neighbors
menu, one hop drawn, the account's own transfers with the export menu, the referral set with
its note, the export dialog, the filter steps with Delete step, and the "where the data is"
panel on the next alert). She also looked at the find, inspector and export dialog screens
and the alert triage flow when she wanted to know what a control does.

Outcome: referred, with two files saved (a findings report and a CSV of the account's eight
transfers). Estimated time on a real alert: about nine minutes, four of them writing the note.

## Transcript (think-aloud)

**The project opens.** "Grey hexagons and orange dots. I don't know what the grey is --
'2,950 nodes drawn as density'. I don't need it. The table at the bottom is my queue: alertId,
account, scenario, riskScore. The last row I can see is AL-40122, ACC-365386, 'Structuring: 3
or more transfers of 9,000...', risk 92. That's the one. Ninety-two is high for us."

"I'd paste the account number. Where's the search box? There isn't a box, there are two little
magnifiers -- one next to 'Graphs', one over the table. I'll take the top one. If I'm honest I'd
first try clicking the row in the table, because it's right there, and I don't know if that
opens the account or just highlights the row."

**Account found.** "OK, 'ACC-365386, personal, US; in Alerts'. The right side: kind personal,
country US, riskScore 92, and a grey line under it -- 'from accounts-2026-08.csv, the bank's
customer risk rating as delivered; not computed by graphty'. Good. That's the first thing QA
would ask, where did 92 come from, and I don't have to explain that it's not some score this
tool made up. alertScenario, alertTime Aug 7 02:17, from the monitoring system's alerts file.
Same text as the case system. '8 neighbors, In 3, Out 5'. Three paid in, five got paid."

"And -- what is this black box? 'Delete step ACC-749505 and neighbors. Undo.' Delete? I just
searched. ACC-749505 was my last alert, the tuition one. Did I delete it? Did I delete the file
I saved for it? I'm not touching Undo, I don't know what it would bring back. That makes me
nervous every single alert if it shows up every time."

**The Neighbors menu.** "There's a 'Neighbors' button with an arrow. Arrow first, I want to see
what it does before it does it. 'Hops from ACC-365386.' OK, so hops FROM my account, that
answers my question. 1 hop, 9 nodes, 13 edges. Nine, but it said eight neighbors -- oh, nine is
him plus eight. 2 hops, 283 nodes, 'mostly through ACC-597001, Pharmacy, 152 neighbors'. So two
hops is everybody who shops at the same pharmacy. That's Sarah's problem, not mine."

"Then 'Filter to neighbors, 1 hop' -- highlighted, with Shift+N -- and 'Select neighbors, 1
hop'. Which one? Filter sounds like it throws away the other 2,991 accounts. Does it delete
them from the file, or just the screen? The one it's highlighting is Filter, so I guess that's
the normal one. I'll click Filter and see what happens."

**One hop drawn.** "OK. Nine dots. The chip at the top says 'Filtered: 9 of 3,000 nodes', so
the other 2,991 are still in there, it's just hiding them. Good, that's a view, not the data.
Five orange diamonds out of nine -- the box says 'alert is true, 5'. So four of the people he
dealt with are also in my queue this month. I would never see that in the case system unless I
opened every counterparty one by one. That's worth something."

"Now the table. It jumped to Edges on its own: '13 of 9,171 edges, sorted by amount, largest
first'. And now there are dates. Aug 17, 9,863.99; Aug 19, 9,815.97 -- wait, that one is
ACC-274887 to ACC-465572. That's not my account. That's two of his neighbours paying each
other. Thirteen edges, and he only has eight. My account is still selected, it's got the ring
around it, the right side is still ACC-365386 -- so why is the table showing me other people's
transfers? I have to read source and target on every row."

**The account's own transfers.** "I click the account again and click the time column. Now it
says 'Edges of the selection, ACC-365386: 8 of 13 edges, sorted by time.' That's what I wanted
in the first place. I'm not sure what I did differently -- it was already selected. Maybe
clicking it again is what tells the table. I'd have to learn that."

"Reading it in order. Aug 3, 90.81 out to ACC-597001 -- that's the pharmacy, nothing. Aug 5,
3,479.70 in from ACC-916833. Then Aug 6: 15:21, 9,260.78 out to ACC-274887; 15:44, 9,662.37 out
to ACC-898028; 17:42, 9,139.58 out to ACC-465572. Three transfers, all 9,000 to 9,999, inside
two and a half hours. That's the rule, exactly -- it fired on the 7th at 02:17, the night
after. So the alert is right about what happened. The question is whether there's a benign
reason."

"What would clear it? Tuition, rent, a car, a family thing. Three different people the same
afternoon, all just under ten thousand -- that's not tuition. And he only got 3,479.70 in the
day before. So where did 28,000 come from? I can't see a balance here. Maybe it's savings,
maybe it's cash deposits that aren't in this file. I'd have to look that up in core banking.
But I don't need the answer to refer it -- I need the answer to CLEAR it, and I don't have it."

"Then after the alert: Aug 17, 9,863.99 in from ACC-796219; Aug 24, 9,326.81 in from
ACC-228299; Aug 30, 168.28 out to ACC-512219, streaming. Those came after the alert fired. QA
might ask why I used them. I'm reviewing it on the 2nd of September, the whole month is fair.
Two more just-under-ten-thousand, both from diamonds."

"Who are the diamonds? The table doesn't say. The map shows orange, the legend says 'alert is
true'. Alerted for what? I'd have to click each one. I'd guess structuring, but I'd guess. I
think I'd click at least two of them, because if four of his counterparties are in my queue for
the same scenario, I want to say that in my note -- and I want to know if those four are going
to land on my desk separately later this month. If I refer this one, do they go up with it, or
do I work each of them from zero again?"

**Decision: refer.** "Refer. Three under-10k transfers out in one afternoon, a source of funds
I can't see, and four alerted counterparties. If I'm not sure, it goes up. That's what level 2
is for. I'm not writing a SAR, I'm deciding if Sarah has to, and she has to."

**Keeping the referral.** "How do I refer? There's no Refer button. In my world I refer in the
case system anyway, so that's fine -- but what do I keep HERE? The next screen shows 'Referred
AL-40122, frozen, 9' in Sets and paths, with a note. So I'd have to make a set out of the
filter. From where? The flow says 'Create set' is in the step's menu, the one on the filter
chip. I'd never have found that by myself; I'd have tried right-clicking the account."

"'Frozen set.' Frozen as in locked? As in it won't change if the data changes? I'd guess it
means the nine accounts stay the nine accounts. I don't know why I'd want an unfrozen one."

"The note. 'Escalate. In 3,479.70 from ACC-916833 on Aug 5 09:09; out the next day, 15:21 to
17:42: 9,260.78 to ACC-274887...' That's all typed. Every amount, every time, by hand, out of
the table I was just reading. That's the copy-paste I do all day, times eight rows. Can I pick
the rows and have them drop into the note? Doesn't look like it. And then I type the same
thing AGAIN in the case system, because the case system is where my disposition goes. So I'd
write it once in the case system and paste it here, or skip the note here."

"And one thing in that note I wouldn't sign: 'Pass-through pattern.' Only 3,479 came in before
28,000 went out. That's not money passing through, that's money going out from somewhere I
can't see. The later inflows came after. I'd write 'structuring, source of funds unknown', not
'pass-through'. QA doesn't care what I thought, they care what I wrote down, so I'm careful
with words like that."

"Also -- who is this set for? The 'where the data is' panel says the project is saved 'in this
browser'. Sarah can't open my browser. So the set and the note only help Sarah if they're in
the file I attach. The set is really for me."

**Evidence.** "On the account's own transfers there was a menu from the '+' next to Export at
the bottom right: 'Export the selection's edges... 8 transfers: time and amount' and 'Export the
selection... 1 node and its attributes'. The eight transfers is what I want. That little '+'
is very small, down in the corner under Appearance. I only saw it because the menu was already
open in the picture."

"The dialog. 'Findings report (.html)', scope 'The selection's edges: ACC-365386, 8
transfers', and it lists the eight rows right there before I save anything. Good. Those are the
right eight, in time order, with dates. 'names: 9 accounts, 6 people, 3 merchants.' 'holds: her
note, these transfers, the account's attributes with the file each came from, the current view
as its figure, the methods'. File evidence-AL-40122.html. And 'Table (.csv)', AL-40122-
transfers.csv, 8 rows. '2 files go to the download folder. Nothing is uploaded.' I click
Export 2 files."

"My export test: can it go in the alert file as one picture and a few lines? The CSV, yes,
the case system takes CSV, or I paste the rows into my narrative. The HTML -- our case system
takes PDF and images. It says it prints to PDF, so that's open it, print, save as PDF, attach.
Another minute per alert. And I didn't see the picture. It says 'the current view as its
figure' -- the current view is the nine dots with all thirteen lines, including the neighbours
paying each other. So the picture shows thirteen transfers and the table shows eight. QA will
count the lines. I'd want to see the picture in the dialog before I save it."

"Did it save? The last screen: the file chip, 'Where the data is': 'written out: 4 files, 10:19
and 10:31, evidence-AL-40121.html, AL-40121-transfers.csv, evidence-AL-40122.html,
AL-40122-transfers.csv'. 'uploaded: nothing, this session'. OK, both alerts' files are there.
That's the answer I'd give compliance if they asked."

**Moving on.** "Now I want the next alert. The filter chip opens 'Filter steps: ACC-365386 and
neighbors, 9', and under it 'Kept from this step: set Referred AL-40122, 1 note. Evidence
exported 10:31.' That's reassuring -- it tells me I didn't forget the file before I delete. But
why do I have to delete anything? I don't want to delete, I want the next alert. Make the set,
write the note, export, open the chip, delete the step, find the next account, filter again.
That's a lot of clicks per alert, and I do thirty of these in the last week of the month."

"And the next one -- ACC-492465 -- 'Filtered: 1 of 3,000 nodes'. One dot. Where are its ten
neighbours? Did I filter to just the account? I'd expect the next alert to open the way this
one did."

## After the task

**Single Ease Question: 5 of 7.** "The part that matters took seconds: four of his
counterparties are orange, and his own eight transfers in time order with dates show the three
under-10k out in one afternoon. In the case system that's three screens and a spreadsheet. But
I lost time on the 'Delete step' notice, on why the table showed thirteen transfers when my
account was selected, on finding 'Create set' and the tiny export '+', and on typing every
amount into the note by hand. Nine minutes, maybe. For a referral that's fine. For a clear it
would be too slow."

**Would she use it instead of her current tool?** "Not instead. The case system is where the
disposition lives, and KYC -- occupation, expected activity, source of funds -- isn't in here,
and that's what clears most alerts. Next to it, for structuring and money-out-fast alerts where
the counterparties matter, yes, I'd open it: it showed me four related alerts I'd otherwise
work separately. For tuition in August, no, I don't need a picture. If the note filled itself
from the rows I picked, the export gave me a PDF with the picture I can see first, and the next
alert opened without deleting anything, I'd use it for every alert with more than a couple of
counterparties. And it's not my call -- my team lead decides that."

## Observed problems

1. With the alerted account already selected after the one-hop filter, the edges table shows
   the step's 13 edges (neighbour-to-neighbour transfers mixed in, sorted by amount); only
   after she selects the account again does it switch to "Edges of the selection", and she
   cannot tell what she did differently. (severity 3)
2. The referral note is typed by hand, re-copying every amount and time from the table she was
   just reading, and she will type the same rationale again in the case system. (severity 3)
3. The export dialog does not show the report's figure; the figure is "the current view", which
   draws all 13 edges of the step while the report's table holds the account's 8 transfers.
   She expects QA to notice the mismatch. (severity 2)
4. The findings report is HTML; her case system takes PDF and images, so each alert costs an
   extra open-print-save step. (severity 2)
5. A leftover "Delete step ACC-749505 and neighbors / Undo" notice appears as soon as she
   finds the new account; she reads it as something she deleted and fears for the last alert's
   file. (severity 2)
6. "Create set" lives in the filter chip's step menu; she would not have found it and would
   have tried right-clicking the account. "Frozen" set is unexplained. (severity 2)
7. The export entry is a small "+" at the bottom of the inspector, under Appearance; she only
   saw it because the menu was already open. (severity 2)
8. Moving to the next alert requires deleting the filter step (six actions to keep a referral
   and start the next); and the next alert then opens as "Filtered: 1 of 3,000 nodes", a single
   dot without its neighbours. (severity 2)
9. The set and note are saved "in this browser"; she realises Sarah cannot see them unless they
   are inside the exported file, so the set's purpose for a referral is unclear. (severity 1)
10. Orange diamonds say a counterparty is alerted but not for what; she has to click each one,
    and nothing tells her whether those four alerts will reach her separately later. (severity 2)
11. The sample note's "Pass-through pattern" is a conclusion she would not sign: only 3,479.70
    came in before 28,000 went out. (Content, not the interface; noted because the note is what
    QA reads.) (severity 1)
12. No search box is visible on opening, only two magnifier icons; and it is unclear whether
    clicking the alert's row in the queue opens the account. (severity 1)
