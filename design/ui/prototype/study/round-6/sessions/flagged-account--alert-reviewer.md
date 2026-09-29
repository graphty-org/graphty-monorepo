# Session: a flagged account -- level-1 alert reviewer

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Task as given by the moderator: "An alert names account ACC-365386. Decide whether to clear it
or refer it, and save what you would attach as evidence."
Material: the task's nine frames as a participant sees them, rendered fresh for this session
(shots/tasks/flagged-account/01 to 09: the opened project with the alert queue, the account
found, the Neighbors menu, one hop drawn, the account's own transfers with the export menu, the
referral set with its note, the export dialog, the filter steps with Delete step, and the
"where the data is" panel on the next alert). She read the alert triage and export dialog
pages only to find out what a control would do when clicked.

Outcome: referred, with two files saved (a findings report and a CSV of the account's eight
transfers). Estimated time on a real alert: about eight minutes, three to four of them writing
the note.

## Transcript (think-aloud)

**The project opens.** "Same as last time. Grey honeycomb, orange diamonds, my queue at the
bottom: alertId, account, scenario, riskScore. AL-40122, ACC-365386, 'Structuring: 3 or more
transfers of 9,000...', risk 92. That's mine. I'd paste the account number, and there's still no
box, there's a magnifier next to 'Graphs'. I know it now, but the first day I'd have clicked the
row in the table and hoped."

**Account found.** "OK. ACC-365386, personal, US. riskScore 92 with the line under it -- from the
accounts file, the bank's rating, not something this tool made up. alertScenario and alertTime
Aug 7 02:17, from the monitoring system's alerts file. Good, that's what QA asks first."

"And there's no black box this time. Last time the second I found the account it told me 'Delete
step' about my previous alert and I didn't know what I'd deleted. It's just quiet now. That's
better. I don't need to know what happened to the last alert while I'm on this one."

"New thing under Connections: Money in 22,670.50, Money out 28,321.82, 'sum of amount over its
transfers'. Hm. So in and out are nearly the same size. My first read is 'about as much came in
as went out, so it's not coming from nowhere'. Hold that -- I don't know yet WHEN it came in.
Sum over the month? Over what dates? It doesn't say. For a structuring alert the order is the
whole thing."

**The Neighbors menu.** "Arrow first. 'Hops from ACC-365386', 1 hop 9 nodes, 2 hops 283, mostly
through the pharmacy and a streaming service. One hop. 'Filter to neighbors, 1 hop' is
highlighted, so that. There's also Direction and From -- 'From: Any time'. I could set a date?
I'm not going to play with it on a live alert."

**One hop drawn.** "Nine dots, 'Filtered: 9 of 3,000 nodes', so the rest is only hidden. Five
diamonds out of nine: four of the people he dealt with are also alerted this month. Still the
best thing on this screen -- I'd never see that in the case system."

"The table jumped to Edges: 'Filtered graph: 13 of 9,171 edges. Sorted by amount.' Top row Aug 17,
9,863.99 into my account, second row ACC-274887 to ACC-465572 -- that's not him. My account has
the ring around it, the right side is still ACC-365386, and the table is showing me other
people's transfers. Same as last time. I have to read source and target on every line."

"Although... reading it, a lot of those neighbour lines go into ACC-465572. 274887, 796219,
898028, 228299, all paying 465572, all 9,600 to 9,800. What is 465572? A grey dot. The table
doesn't say. I'd have to click it."

**The account's own transfers.** "I click the account again, click the time column. Now it says
'Edges of the selection, ACC-365386: 8 of 13 edges in the filtered graph. Sorted by time.' Right,
that's his. I still can't tell you what I did differently from before -- he was already selected.
And at the bottom: '8 rows selected'. Selected? I didn't select any rows. I selected an account.
Does that mean if I click a row I lose the other seven? I'll leave the rows alone."

"The footer: 'Money in 22,670.50 USD (3 transfers), Money out 28,321.82 USD (5 transfers).' Same
numbers as the right side. Now read in order. Aug 3, 90.81 out to the pharmacy. Aug 5 09:09,
3,479.70 in from ACC-916833. Aug 6, 15:21 9,260.78 out to 274887; 15:44 9,662.37 out to 898028;
17:42 9,139.58 out to 465572. There's the rule. It fired Aug 7 02:17. Then AFTER the alert: Aug 17,
9,863.99 in; Aug 24, 9,326.81 in. Aug 30, 168.28 out, streaming."

"So that money-in total is misleading for me. Of the 22,670 in, only 3,479.70 was there before
the 28,000 went out. The other 19,190 came in ten and eighteen days AFTER. If I'd written 'in and
out roughly balance' off the right-hand panel, QA would have me. I'd want 'money in before the
alert' or the total split at the alert time. Or just don't show me a month total on a structuring
alert, because the order is the point. At least the rows are there, so I caught it -- but a
newer analyst reads the big number first."

"Where did 28,000 come from on Aug 6? Not in this file. Could be cash, could be another bank. I'd
need core banking for that. I don't need it to refer. I need it to clear, and I don't have it."

**Who is ACC-465572?** "I only find out on the next screen. The set's members list says
ACC-465572 'merchant', and the note says '(money transfer ACC-465572)'. A money transfer business.
So one of his three under-10k transfers went to a money transmitter the same afternoon, and all
four of his alerted counterparties pay the same money transmitter too. That's the thing I'd most
want to know and it's in a grey dot with no label. In the table it's just a number. If the Edges
table had the counterparty's kind next to it -- 'money transfer', 'pharmacy' -- I'd have had this
two minutes earlier. I'm guessing the note-writer clicked it. I'd have had to."

**Decision: refer.** "Refer. Three transfers of 9,000 to 9,999 out in one afternoon with only
3,479.70 in beforehand, one to a money transfer service, and four counterparties alerted who pay
that same service. If I'm not sure it goes up, and I'm not sure. I'm not writing a SAR, I'm
deciding if Sarah has to. She has to."

**Keeping the referral.** "There's no Refer button, which is fine, I refer in the case system.
What do I keep here? The next screen has 'Referred AL-40122, frozen, 9' under Sets and paths, made
from 'Filter step ACC-365386 and neighbors'. So it came from the step. I'd have tried
right-clicking the account or the '+' next to 'Sets and paths'. I only know it's the step's menu
because I saw 'Create set' in that menu on the Delete step screen. 'Frozen' -- I still assume it
means the nine stay the nine."

"Also: the moment the set is made, the table goes back to 'Filtered graph: 13 of 9,171 edges,
sorted by amount.' My time-sorted eight are gone. I'd sorted them to write the note from. Now I
write the note looking at the wrong list."

"The note. Every amount, every time, by hand. Same copy-paste as last time, eight rows' worth.
There's a footer that adds up money in and out, but nothing that drops the rows I'm looking at
into a note. And I'm typing it again in the case system anyway."

"And the note still ends 'Pass-through pattern.' I wouldn't sign that. Pass-through is money in,
money out. Here the money went out first and came in after, from other alerted accounts. That's
the opposite order. I'd write 'structuring, source of funds for Aug 6 outflows unknown; one
outflow to a money transfer service'. QA reads what I wrote, not what I meant."

**Evidence.** "Selected the account again. The '+' next to Export, bottom right, still tiny, under
Appearance. 'Export the selection's edges... 8 transfers: time and amount.' That."

"The dialog lists the eight rows before I save, in time order, with dates. Right eight. 'names: 9
accounts, 6 people, 3 merchants.' 'holds: her note, these transfers, the account's attributes
with the file each came from, the current view as its figure, the methods.' evidence-AL-40122.html.
And the CSV, AL-40122-transfers.csv, 8 rows. '2 files go to the download folder. Nothing is
uploaded.' Export 2 files."

"Export test. The CSV goes in, fine. The HTML: our case system wants PDF or an image. 'Prints to
PDF' means open, print, save as, attach. Another minute. And I still don't see the picture before
I save. 'The current view as its figure' -- the current view is nine dots and thirteen lines, the
neighbours paying the money transmitter included. Actually, for this one, those extra lines help
Sarah. But the table in the same file says eight transfers, and QA counts lines. Show me the
picture in the dialog, and let me choose his eight or all thirteen."

"Does 'her note' in the report carry the 'Pass-through' line? Yes, it's the note on the set. So if
I didn't fix the wording, it's in the evidence file."

**Moving on.** "Filter chip, the step, 'Kept from this step: set Referred AL-40122, 1 note.
Evidence exported 10:31.' That line is reassuring, it tells me nothing gets lost. But I still have
to Delete step to get to the next alert. Create set, note, export, open the chip, the dots menu,
Delete step, find the next account, filter. Every alert. Thirty alerts in the last week of the
month."

"And the next one, ACC-492465, opens as one dot. 'Filtered: 1 of 3,000 nodes', 10 neighbors on the
right but I can't see them. I'd expect it to open the way the last one ended, with its
neighbours. Good thing on that one: Money in 0.00, Money out 38,661.77, a consulting firm with
nothing coming in. For THAT scenario the total is exactly what I need."

"'Where the data is': written out 4 files, both alerts' reports and CSVs, uploaded nothing. That's
what I'd tell compliance."

## After the task

**Single Ease Question: 5 of 7.** "Better start than last time: nothing scary popped up when I
found the account, and the money totals are there without me summing a column. But the money-in
total nearly fooled me -- it counts money that came in after the alert, and on a structuring alert
that's backwards. I still had to click the account twice to see only its own transfers, I still
had to guess that the grey dot was a money transfer service, the set still hides in the step's
menu, the table forgets my sort when I make the set, and I still type every number into the note.
Eight minutes. Fine for a referral, too slow for a clear."

**Would she use it instead of her current tool?** "Not instead. The disposition lives in the case
system and KYC isn't here -- occupation, expected activity, source of funds -- and that's what
clears most alerts. Next to it, for structuring and fast-money-out alerts where the counterparties
matter, yes: it showed me four related alerts and a shared money transmitter I'd otherwise find
one screen at a time, or not at all. For tuition in August, no. If the table showed what each
counterparty is, the money totals split at the alert time, the note filled from the rows I picked,
the export gave me a PDF with a picture I can see first, and the next alert opened with its
neighbours without deleting anything, I'd open it for every alert with more than a couple of
counterparties. It's not my call either way -- my team lead decides."

## Observed problems

1. The new Money in / Money out totals (inspector and table footer) sum the whole month, so
   22,670.50 in looks like it covers 28,321.82 out; only 3,479.70 arrived before the alerted
   outflows, the rest came 10 and 18 days after. On a structuring alert the order is the finding,
   and the total invites a wrong written rationale. (severity 3)
2. With the alerted account already selected after the one-hop filter, the Edges tab shows the
   step's 13 edges sorted by amount; only after selecting the account again does it switch to
   "Edges of the selection", and she cannot tell what she did differently. (severity 3)
3. The counterparty's kind is not shown in the Edges table or on the canvas: ACC-465572 is a
   grey, unlabelled dot, and she learns it is a money transfer service only from the set's member
   list and the prewritten note. It is the fact that most supports the referral. (severity 3)
4. The referral note is typed by hand, re-copying every amount and time; nothing drops the rows
   she is reading into a note, and she types it again in the case system. (severity 3)
5. Making the set switches the Edges tab back to the step's 13 edges sorted by amount, losing the
   time-sorted 8 she was writing the note from. (severity 2)
6. "8 rows selected" in the table footer when she selected an account, not rows; she fears
   clicking a row will change what is selected, and leaves the table alone. (severity 2)
7. "Create set" lives only in the filter step's menu; she would have tried right-clicking the
   account or the "+" beside Sets and paths. "Frozen" is unexplained. (severity 2)
8. The export dialog does not show the report's figure (the current view, 13 edges) while the
   report's table has 8 transfers; she cannot choose which the figure shows. (severity 2)
9. The findings report is HTML; her case system takes PDF and images, so each alert costs an
   open-print-save step. (severity 2)
10. Moving on still needs Delete step (about six actions to keep a referral and start the next),
    and the next alert opens as one dot, "Filtered: 1 of 3,000 nodes", without its neighbours.
    (severity 2)
11. The export entry is still a small "+" beside Export at the bottom of the inspector, under
    Appearance. (severity 1)
12. The sample note still says "Pass-through pattern", which the transfer order contradicts, and
    the note goes into the evidence file verbatim. Content, not interface; noted because the note
    is what QA reads. (severity 1)
13. No visible search box on opening, only a magnifier by Graphs; unclear whether clicking the
    alert's queue row opens the account. (severity 1)

## What worked

- The "Delete step ... Undo" notice no longer appears when she finds the next account; nothing
  alarming greets the new alert.
- Attribute provenance lines (riskScore from the accounts file, alert fields from the monitoring
  system's file) answer QA's first question.
- Five orange diamonds in one hop: four related alerts visible at a glance.
- Money totals are right where the scenario is about volume (the next alert: 0.00 in, 38,661.77
  out for a consulting firm).
- The export dialog lists the exact eight rows before writing, and "Kept from this step ...
  Evidence exported 10:31" confirms nothing is lost before deleting the step.
