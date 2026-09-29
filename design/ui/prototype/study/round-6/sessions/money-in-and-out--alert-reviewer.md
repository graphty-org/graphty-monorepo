# Money in, money out -- Nadia, level-1 alert reviewer

**Participant (simulated):** Nadia, level-1 transaction monitoring analyst at a mid-size bank,
fourteen months in (study/personas/alert-reviewer.md). Works an alert queue in the case system; has
never used a graph tool herself. Patience: the length of one alert. Totals go in a spreadsheet.

**Task as given by the moderator:** "Your manager wants the ten accounts in the March transfers
that take in far more money than they send out, with the amounts, by end of day."

This is the same wording she had in the previous round, where the screens had no per-account money
totals and she scored it 2 of 7 and did the work in Excel.

**Viewport:** 1536 by 740 (her docked laptop at 125 percent scaling), participant view (design notes
hidden). Renders in `shots/r6-nadia-money/`.

**Does this round's design show money per account?** Yes, on three of the five screens: Quick
actions and the finished run on the Run-and-read screen ("Money in", "Money out", "Money in minus
out"), the table's New column menu and its Money columns, and the inspector's Totals. The main
frame at rest and the Results panel page itself show no money measure (the Results panel page is
drawn on the protein sample; the money run appears inside the Run-and-read screen). The task ran.

| Step | What she looked at | Render |
|---|---|---|
| 1 | The March transfers project at rest | `frame.png`, `frame-s1.png` |
| 2 | Quick actions, "money" typed | `run-money.png` |
| 3 | Money in, finished, with the table | `run-money-read.png` |
| 4 | The table's column menu, New column | `table-large.png` |
| 5 | The table with Money in, Money out, Money in minus out | `table-selected.png` |
| 6 | One account in the inspector | `inspector-flagged.png`, `inspector-flagged-tall.png` |
| 7 | Export table | `table-out.png` |
| - | Catalog, finished result and table ranks on the sample data | `run-catalog.png`, `run-quick.png`, `results-finished.png`, `table-ranked.png` |

## Think-aloud

**1. The project opens.** (`frame.png`)

"Transfers, March 2026. Same as last time. 3,000 accounts, 9,113 rows. Grey honeycomb, no labels.
Fine, I don't need the picture.

Right side still says 'direction followed, amount not used yet. Change...'. That's what put me off
last time. Amount is the only column I care about and the first thing it tells me is it isn't using
it. I'm still not pressing Change. I don't want to reload the file and then explain to QA why my
numbers differ from the core banking extract.

Nothing on this screen says money. Density, weak components, total degree distribution -- that's
counts. So either it can do money somewhere else or it can't, and this screen doesn't tell me which."

**2. Quick actions.** (`run-money.png`)

"There's a Quick actions button in the middle bar, with a lightning bolt. That's the only thing that
looks like a search for 'do something'. My manager said money, so I type money.

Oh. 'Money: sums of amount, in dollars.' Run Money in -- total amount of the transfers into each
account. Run Money out. Run Money in minus out -- what each account kept: in less out.

OK, that's my task, word for word nearly. 'Take in far more than they send out' -- in minus out.
And under it, 'Counts of transfers, not money: Links in (count), Links out (count)'. Good. That's
exactly the trap from last time, the account with 400 tiny transfers, and it's split off and says
'not money'. Somebody listened.

My own word would have been 'received' or 'incoming', not 'money'. I don't know if typing those
finds it. I typed money because the task said money."

(Moderator note: the mock shows only the query "money". Whether "received", "incoming" or
"credits" find the same entries is not drawn.)

**3. The result.** (`run-money-read.png`)

"This is Money in, not in-minus-out -- the screen I have is the Money in one. I'd have clicked
in-minus-out, but I'll read what's here; I assume the other looks the same.

Top accounts: ACC-393859, $440,784. ACC-697114, $241,450. ACC-893168, $149,438. ACC-593226,
$124,579. ACC-527694, $113,261. Five. I need ten. '2,995 more in the table.' OK, and the table is
already open underneath: 'Full graph: 3,000 accounts, 1 selected. Sorted by Money in, highest
first.' That's a sentence I can paste into the email.

Each of the five says how many links in: '907 links in, #1', '37 links in, #37'. And the line
'ACC-893168 is #3 by money in and #37 by Links in (count): 37 transfers, fewer and larger.' That's
actually useful -- that's the kind of line I write in an alert file. Few large incoming transfers
is more interesting to me than 907 small ones.

But I didn't ask for links. Next to money in I want money OUT. My manager asked 'far more than they
send out'. If it's going to put a second number beside the dollars, put the dollars going out.

Top of the panel: 'on: full graph, 3,000 accounts. Sum of amount, in dollars, on the transfers
into each account. Directed. CPU.' I don't know what CPU is doing there, but 'sum of amount, in
dollars, on the transfers into each account' is the definition QA would want. Good.

'Re-run (keeps Run 1)'. Did running this change my data? Did it write a Money in column into the
accounts? I think it's just a calculation it keeps, like a pivot in a separate sheet. I'm not sure.

And all five are 'merchant'. Well, yes. Shops take in money from customers and don't send it back.
That's what a shop is. If my manager wanted shops he'd have said shops."

**4. Getting the three columns side by side.** (`table-large.png`)

"Last time 'New column' was the only thing that might have done it and it wasn't drawn. Now the
submenu is there: Money in, sum of amount on transfers in, USD. Money out. Money in minus out.
Then Links in (count), Links out (count), 'counted, not summed'. Same words as Quick actions. So I
could do the whole thing from the table without Quick actions at all. That's the way I'd have gone
first honestly, because the table is the part that looks like my spreadsheet."

**5. The table with the money columns.** (`table-selected.png`)

"There it is. 'Weighted degree: sum of amount (USD), full graph'. I don't know what weighted degree
is, but underneath it says Money in, Money out, Money in minus out, so I'll ignore the heading.
Money in 0.00 to 440,783.97, money out 0.00 to 69,007.50, in minus out -69,007.50 to 440,783.97.
So the top account took in 440 thousand and sent nothing. Merchant again.

This screen is only 14 selected accounts though -- 'Selected: 14 nodes'. Not what I want. But the
header says the numbers are over the full graph, so I think if I click 'Show filtered graph' or
clear the selection I get all 3,000, then I sort Money in minus out, highest first, from its column
menu -- Sort descending is there -- and read off ten. I'm assuming. I can't see that screen.

Small thing: the panel on the left said '$440,784' and the table says '440,783.97' without the
dollar sign. Same number, I get it, but when I paste the ten rows into the email and my manager
compares with the panel screenshot, it looks like two numbers. QA would ask."

**6. 'Far more' -- and the merchants.** (`table-selected.png`, `table-large.png`)

"Here's my real problem, and it isn't the tool's fault exactly. 'Far more money than they send
out.' In minus out is a difference. An account that got 50,000 and sent 45,000 comes out at 5,000;
an account that got 6,000 and sent nothing also comes out at 6,000, and that second one is the one
my manager means, I think. There's no 'in divided by out' anywhere. I'd send both columns and let
him look.

And the top of the list is going to be merchants. I'd filter kind to personal and business -- the
column menu has 'Filter to...' on the kind column, I assume it's the same menu -- and send two
lists: all accounts, and without merchants. That's me deciding, not the tool. I'd write it down
so QA sees why."

**7. Checking one.** (`inspector-flagged.png`, `inspector-flagged-tall.png`)

"If I click an account, the right side has Totals: Money in $19,449.22, Money out $28,587.48,
'summed by graphty from transfers-2026-03.csv'. That's good for a spot check -- I'd check one
against core banking before I trust the whole list. And In 3, Out 5 transfers right above it. If
the numbers match core banking for one account, I believe the column.

This is the bit Excel can't do: I'm on the account, and 'Neighbors' is right there to see who is
paying it. For the ten, that's where I'd go next if one looked wrong."

**8. Export.** (`table-out.png`)

"Export table... Table (.csv), rows 'All 300: nodes, full graph' on this sample; mine would be all
3,000. Order: whatever it's sorted by. 'Methods always written beside it' -- a text file saying how
it was computed. QA would like that, I'd attach it.

I only want ten rows. I'd export the lot and cut it in Excel, or I'd just copy the ten rows off the
screen if copying works. I don't know if I can select ten rows and export only those. Either way
it's two minutes, not twenty."

**9. Export test.** "One picture and a few lines? The table, sorted, top ten, three money columns,
the line 'Full graph: 3,000 accounts, sorted by Money in minus out, highest first' -- yes, that's
a screenshot and a few lines. The honeycomb adds nothing, same as before."

## Single Ease Question

**5 out of 7.** "Found it in under a minute once I typed money, and the table has the three
columns I need. It loses points because the first screen still says amount isn't used, the list
beside Money in gives me link counts instead of money out, I only see five and have to go to the
table for ten, and 'far more' still needs me to decide difference or ratio and what to do about
the shops."

## Would she use this instead of her current tool?

"For this job, probably yes -- if they let me have it. Last time it was the core banking extract
plus a twenty-minute pivot in Excel. Here it's type money, sort a column, export. Maybe five
minutes, and it tells me in writing how it summed, which I'd have to write myself in Excel.

I'd still end in Excel to cut to ten rows and write the email. And it's not my choice what we
install. But the part I'd actually miss if I went back is clicking one of the ten and seeing who
is paying it, with the money in and out right there. That's the thing a spreadsheet can't do."

## Observed problems (moderator notes)

1. **The frame at rest still says "amount not used yet"** and shows no money measure. She read it
   again as "the tool ignores the money" and did not press Change.... She found money only because
   the task's own word, typed into Quick actions, matched. (Moderate.)
2. **Quick actions was drawn only for the word "money".** Her own words are "received",
   "incoming", "credits"; whether they find Money in is not shown. (Moderate; untested.)
3. **The finished Money in list pairs each account with its link count, not its money out.** The
   task, and her reading of it, wants in and out side by side; she had to go to the table for that.
   She did value the "fewer and larger" line. (Moderate.)
4. **The results list shows five; the task needs ten.** "2,995 more in the table" was clear and the
   table was already open and sorted, so this cost little. (Minor.)
5. **Only a difference, no ratio.** "Far more" is ambiguous; Money in minus out ranks a big
   merchant that also pays out above a small account that pays out nothing. She would send both
   columns and let her manager judge. (Moderate; task ambiguity the product could help with.)
6. **Merchants dominate the top of the list.** She would filter out merchants herself; nothing
   suggests it. (Minor; her judgment, as it should be.)
7. **Two formats for the same amount:** "$440,784" in the results list, "440,783.97" without a
   currency sign in the table, "$440,783.97" in the inspector. She worried a manager comparing a
   screenshot with the pasted rows would see two numbers. (Minor.)
8. **"Weighted degree" group heading** over the Money columns is jargon to her; the column names
   carried it. (Minor.)
9. **Did running a measure change the data?** "Re-run (keeps Run 1)" left her unsure whether Money
   in was written into the accounts or kept aside. (Minor.)
10. **No state shows the full graph sorted by Money in minus out,** and the Export dialog does not
    say whether she can export only the top ten. She assumed both work. (Minor for the mock.)
11. **The Run-and-read and inspector screens stop at 1440 pixels wide** and leave an empty strip at
    her 1536 viewport; the main frame fills it. She noticed the blank strip on the right and said
    nothing more. (Cosmetic.)
