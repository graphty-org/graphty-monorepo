# Session: an alert names ACC-365386 -- is its neighbourhood suspicious?

Participant: Nadia, level-1 transaction monitoring analyst (simulated; see
study/personas/alert-reviewer.md). Screens: the alert triage mock (states 1, 5-12 of
screens/alert-triage.html), with the Find and Inspector mocks for reference. Rendered at her
browser size, 1536 by 740; the renders are in shots/r2-flagged-nadia--*.png.

Moderator's task, read once: "An alert names account ACC-365386. Start from the alert and decide
whether its neighbourhood is suspicious."

Outcome: she reached a decision (escalate) in what she estimated at seven or eight minutes, first
time through. She pressed the wrong half of the neighbours button once, lost a minute to a notice
she thought meant she had deleted something, and read the transfers from a table that showed two
rows at a time. Single Ease Question: 5 of 7.

## Transcript

**Project open (shots/r2-flagged-nadia--open-z.png)**

"OK. Grey honeycomb blob with orange diamonds. I don't know what the blob is. The orange ones are
alerts, the little box says 'alert is true, 50'. Fine. I'm ignoring the picture.

The table at the bottom is my queue -- alertId, account, scenario, risk score. That I understand.
AL-40116, 40117... I can see down to 40120. Mine is ACC-365386, so it's further down. I'd scroll.
Actually no -- I have the account number on the clipboard from the case system. Where's a search
box?"

She looks across the top. "Hamburger, 'August alerts', 'Full graph'... there's a magnifying glass
next to 'Graphs'. That one." Clicks it, pastes.

**Find (shots/r2-flagged-nadia--seed-find.png)**

"One hit, ACC-365386, 'personal, US; in Alerts'. Good, and it circled it in the blob. Right side
filled in: personal, US, risk score 92, alert true, and the scenario -- 'Structuring: 3 or more
transfers of 9,000 to 9,999 USD out in 30 days'. OK, that's the one thing I needed from the case
system and it's here. 92 is high.

Wait -- what's that black box? 'Delete step Neighbors of ACC-749505, 1 hop. Undo.' Did I just
delete something? I didn't press delete. ACC-749505 is -- that was my last alert, the tuition one.
Did pasting into search delete it?" (Pause.) "I'm not touching Undo because I don't know what it
would bring back. I'll assume the last one is fine because I already exported it. But that scared
me for a second."

"'8 neighbors, In 3, Out 5.' So three accounts paid him and he paid five. That I can use.
'Neighbors' -- you mean counterparties."

**The neighbours button (shots/r2-flagged-nadia--seed-menu.png, seed-selected.png)**

"How do I see the eight? There's a row of little icons under the name. A thing with dots and a
little arrow, a funnel, a pin. No words on any of them. The funnel is filter, I know that from
Excel. The dots-thing looks like 'connections'."

She clicks the dots icon itself (the main half). Nine circles light up scattered all over the
blob (seed-selected).

"Right... nine circles, all over the place. The right side now says '9 nodes, Selection, 6
personal, 3 merchant, alert 5 true, 4 false'. Five of the nine are alerted? That's already
something. But the picture is useless, they're spread across the whole blob and I can't see who
paid who. The table says 'Full graph: 3,000 nodes, 9 selected.' So it didn't do anything to the
data? Or did it? I don't know if I changed something."

She tries the little arrow next to the icon instead (seed-menu).

"Oh, a menu. 'Hops from ACC-365386.' OK, so a hop is from him, that I get. '1 hop, 9 nodes, 13
edges. 2 hops, 283 nodes' -- no, I'm not looking at 283 accounts, that's level 2's job. It even
says why: a pharmacy and a streaming service. Makes sense, everybody pays a pharmacy. That's
actually a nice touch, I'd have clicked 2 hops otherwise and drowned.

Then 'Select neighbors, 1 hop' and 'Filter to neighbors, 1 hop'. What's the difference? I just did
select, apparently, and it didn't narrow anything. So filter must be 'show me only these'. I'll
take filter."

**One hop, filtered (shots/r2-flagged-nadia--seed-hop1.png)**

"There we go. Nine dots, lines between them. Five orange diamonds -- five alerted accounts in one
guy's circle. That's not normal. The chip up top says 'Filtered: 9 of 3,000 nodes', so the other
2,991 are only hidden, I hope. I'd want it to say 'hidden' or 'not deleted', honestly. QA asks what
I looked at, not what I hid.

The picture: lines but I can't tell direction, I can't see amounts. I need the transfers. The table
switched to 'Edges', 'sorted by amount, largest first' -- that's exactly the order I'd sort in
Excel. Two rows visible:
ACC-796219 to ACC-365386, 9,863.99. ACC-274887 to ACC-465572, 9,815.97.

Two rows. I need thirteen. I have to scroll a box that's the height of my thumb." She scrolls
(in the mock she reads the rest from the table's contents). "OK:

- in: 9,863.99 from 796219, 9,326.81 from 228299, 3,479.70 from 916833
- out: 9,662.37 to 898028, 9,260.78 to 274887, 9,139.58 to 465572
- and small stuff to streaming and pharmacy -- ignore
- and then 274887, 796219, 898028 and 228299 ALL send 9,600 to 9,800 to 465572.

What's 465572? It's a grey dot with no label except the number. In the earlier table (selected
state) it said 'merchant, Money transfer'. So everybody in the circle sends just-under-ten
thousand to a money transfer service. That's the pattern. Tuition this is not."

"Where are the dates? The rule says 30 days. I can't tell from this if these were three
transfers in one week or spread out. I'd have to go back to the core banking screen for dates,
every one. That's the part I'd have wanted here."

**Decision**

"It's suspicious. Five alerted accounts in one circle, all structuring, money going around the
circle and out through one money transfer merchant. I'm not clearing that. Escalate. I'm not
writing the SAR, I'm deciding if Sarah has to, and she has to.

Took me -- seven, eight minutes, including the scare and the wrong button. Next time it'd be
maybe four. That's inside my ten."

**Writing it down (shots/r2-flagged-nadia--seed-refer.png, tuition-clear.png, next-delete.png)**

"Now I need it in the alert file. One picture, a few lines. Is there a note thing? There's
'Notes' on the far left, and 'Export files...' top right. The export dialog from the last alert
(tuition-clear) is actually good: 'Findings report, the evidence file', scope 'Filter step:
Neighbors of ...', figure as PNG, and the transfers as CSV. 'Nothing is uploaded.' That's the
first time a tool told me that without me asking IT. I'd attach the PNG and paste the CSV rows
into the case.

The mock shows a set called 'Referred AL-40122' with a note on it. How would I make that? The
description says from the step's menu -- the filter chip, then a menu on the step, then 'Create
set' (next-delete). I would never have found that. I don't need a set, though; I need the case
system to have the file. If Sarah needs the nine accounts she can read my note.

The note someone typed in the mock -- 'Escalate. Out: 9,662.37 to ... Pass-through pattern.' --
yes, that's what I'd write. It took me reading a two-row table to get those numbers though. If it
wrote the in/out totals for me I'd copy it straight into the case."

**Cleanup (next-delete.png, next.png)**

"Delete step -- and it tells me what was kept: the set, the note, the export at 10:31. OK, so
that's where the scary notice came from; it's the last alert's step being thrown away. If it had
said 'Previous alert's view closed -- your note and export are kept' I wouldn't have jumped."

"Six clicks to start the next one: create set, add note, delete step, find, the hit, filter. The
case system is fewer. I'd skip the set every time."

**The Find and Inspector pages**

"These are on other data -- a novel, proteins. The search panel says '2 results in all 77 nodes'
and splits hits inside and outside the filter; fine, that's what I did with the account number.
The inspector page shows a tooltip on the dots icon: 'Select neighbors, 1 hop: 33 nodes'. Why
doesn't the button just say that on it?"

## After the task

**Single Ease Question: 5 of 7.** "Once I was on the right button it was quick and the answer was
obvious. The wrong button and the notice cost me the time."

**Would you use this instead of your current tool?** "Not instead. Next to. For ninety percent of
my alerts I don't need a picture -- one transfer, one profile, tuition, close. For the ones where
the counterparties matter, like this one, yes: five alerted accounts around one guy is something I
would never have seen in the case system, I'd have cleared him on his own transfers and QA would
have killed me later. But I'd need the dates in the transfer table, and I'd need the table to be
taller than two rows on my screen, and I'd need someone above me to approve it being installed.
Day twenty-nine I'm not learning it."

## Problems observed

1. Leftover "Delete step Neighbors of ACC-749505, 1 hop / Undo" notice on arriving at the new
   account read as "I just deleted something"; she avoided Undo out of fear. (severity 2)
2. The neighbours split button has no text; its main half does Select, which lit nine points on
   the density and changed nothing she could read. Select versus Filter was unclear until she
   tried both. (severity 3)
3. Transfer table shows only two rows at 1536 by 740; reading 13 transfers means scrolling a
   thumb-high box. (severity 3)
4. Transfers carry no dates, so the rule's "in 30 days" cannot be checked here; she would go back
   to core banking for every date. (severity 3)
5. The filtered drawing shows no direction or amount on the lines and no category on merchant
   dots; she learned ACC-465572 was a money transfer service only from the earlier table. (severity 2)
6. "Filtered: 9 of 3,000 nodes" did not tell her whether the rest was hidden or removed.
   (severity 2)
7. Making the set for the referral is behind the filter chip and a step's menu; she would not
   find it and would skip it. (severity 1)
8. Opening view is a density blob that means nothing to her; she ignored it. (severity 1)

## What worked

- Pasting the account number into search found it and filled the right column with the
  scenario and risk score, the one thing she normally copies from the case system.
- "In 3, Out 5" counterparties at a glance.
- The hop menu gave sizes before committing and explained why 2 hops jumps to 283 (pharmacy and
  streaming): she did not drown.
- Five orange diamonds among nine accounts made the answer visible in one look once filtered.
- Transfers sorted by amount, largest first, is her own spreadsheet habit.
- The export dialog: one evidence file, a picture, CSV rows, and "Nothing is uploaded".
