# Session: ten accounts that take in far more than they send out -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). A simulated participant, played in character. Dark
mode, study view (design notes hidden).

Task as given by the moderator, and nothing more: "Your manager wants the ten accounts in the
March transfers that take in far more money than they send out, with the amounts, by end of day."

Check before the session: the money screens of the transfers project show weighted degree -- the
table's New column menu offers Money in, Money out and Money in minus out; Quick actions finds them
under "money"; a finished Money in run is drawn; the inspector shows Money in and Money out on an
account. The task ran.

Screens, in the order she met them (renders in `shots/`):

1. `screens/frame-at-rest.html?dataset=transactions` -- Transfers, March 2026 at rest
   (`r6-priya-money-frame.png`)
2. `screens/run-and-read.html#money` -- Quick actions, typed "money" (`r6-priya-money-run-money.png`)
3. `screens/run-and-read.html#money-read` -- the finished Money in run and the table it opens
   (`r6-priya-money-run-money-read.png`)
4. `screens/table-dock.html#large` -- the degree column's menu, New column
   (`r6-priya-money-table-large.png`)
5. `screens/table-dock.html#selected` -- the 14 flagged accounts with all three money columns and
   the footer totals (`r6-priya-money-table-selected.png`)
6. `screens/inspector.html#flagged` -- one account's Money in and Money out, to cross-check
   (`r6-priya-money-insp-flagged.png`)
7. `screens/results-panel.html#catalog`, `screens/run-and-read.html#catalog` -- the two catalogs,
   looked at afterwards (`r6-priya-money-results-catalog.png`, `r6-priya-money-run-catalog.png`)

## Transcript

**Before starting.**

> "Same ask as last time. Money in minus money out per account, over March, top ten. Last time
> this tool couldn't add up a number and I did it in pandas off the edge export. Four lines. So
> the bar hasn't moved: beat four lines of pandas, or at least tie it without me having to
> double-check everything."

> "Approved, no. Runs where -- 'Nothing has been sent from this project', rail says 'Assistant Off.
> Nothing is sent.' Fine. Study, so I keep going."

**1. The frame at rest.**

> "'Transfers, March 2026.' 3,000 nodes, 9,113 edges. Blob. Statistics: 'Loaded:
> transfers-2026-03.csv, direction followed, amount not used yet. Change...' -- that's the line
> that sent me down a hole last time. I'm not clicking Change. If it can sum money it'll be in the
> command thing or the table, not in a setting on the whole file."

> "No query box. There's Quick actions, Ctrl+K. That's the closest thing to typing, so that's
> where I go. I type what I want."

**2. Quick actions, "money".**

She types "money".

> "Oh. OK. 'Money: sums of amount, in dollars.' Run Money in -- 'Total amount of the transfers
> into each account.' Run Money out. Run Money in minus out -- 'What each account kept: in less
> out.' And then a separate group, 'Counts of transfers, not money': Links in (count), Links out
> (count)."

> "That split is right. Last time the only thing near this was a degree column that was counting
> transfers and looked like it could be money. Now the counts are labelled as counts, in the group
> title and in the name. I can't mistake one for the other."

> "What I actually want is 'Money in minus out'. That's the net. But I want all three columns in
> the output, because my manager will ask 'how much in' the second he sees a net. Let me run
> Money in first and see what a result looks like before I trust it."

She picks Run Money in. It runs at once; no cost prompt.

**3. The Money in result.**

> "'Money in, Sep 29 10:31.' Sep 29 is today, that's when I ran it. Not the data range. The scope
> line says 'on: full graph, 3,000 accounts' and 'Sum of amount, in dollars, on the transfers into
> each account. Directed. CPU.' Good, it says what it summed and which direction. It doesn't say
> March anywhere in the result itself -- I have to know the graph is March. I do, it's in the title
> bar. But if I paste this panel into a ticket, 'Sep 29' is the only date on it and somebody will
> read that as the time range."

> "'Top accounts with Links in (count)' -- wait, is this sorted by links? ... No. Numbers on the
> right go down, 440,784, 241,450, 149,438. Sorted by money, and the link count is just shown under
> each one. The heading reads like the ranking is by links. Took me a second."

> "ACC-393859, $440,784, 907 links in. ACC-697114, $241,450. Third one's interesting: ACC-893168,
> $149,438 from only 37 transfers, and it says so: '#3 by money in and #37 by Links in (count): 37
> transfers, fewer and larger.' That's a sentence I'd actually use. Fewer, larger transfers is a
> thing we look at."

> "Table underneath: 'Full graph: 3,000 accounts, 1 selected. Sorted by Money in, highest first.'
> Columns id, kind, Money in, Links in (count), rank by Links in. kind column: merchant, merchant,
> merchant, merchant, merchant, merchant. As I said last round. Everybody pays merchants and they
> never send anything back. Technically right, operationally noise."

> "Rounding: the panel says $440,784. I'll check the exact number somewhere else."

**4. Adding Money out and the net as columns.**

> "Now I need Money out and in-minus-out next to it. Column menu on degree -- New column, arrow.
> Last time the arrow did nothing. This time: Money in, 'Sum of amount on transfers in, USD'. Money
> out. Money in minus out, 'Money in less money out, USD'. Then Links in (count), Links out (count).
> Same names as the command box. Good, they agree with each other."

> "So: add Money out, add Money in minus out, sort by Money in minus out, descending. The top of
> that is my list. Two clicks and a sort. That's faster than opening Jupyter."

> "I'd also filter kind to personal -- 'Filter to...' is in the same column menu -- and give the
> manager two lists, overall and personal. The personal list is the one anyone reads."

**5. The flagged accounts, all three columns.**

She looks at the table with all three money columns drawn, on the 14 flagged accounts.

> "Here's what it looks like with everything on. Header group 'Weighted degree sum of amount (USD),
> full graph': Money in, Money out, Money in minus out, each with a range and a little histogram.
> Money in minus out runs -69,007.50 to 440,783.97. So the top net account in the whole graph is
> +440,783.97. That's ACC-393859, the $440,784 one. Money out must be zero on it. Nobody sends
> money out of a merchant account in this data."

> "'Weighted degree' in the group header. That's the nerd word. The columns under it are in English,
> so I can live with it, but when this goes in a CSV I want 'Money in' as the header, not
> 'weighted degree'. I'd check the export."

> "And look at the footer: 'Sum of Money in, 14 rows: 340,978.02 USD. Money out 400,931.03 USD.
> Money in minus out -59,953.01 USD.' The flagged ones net negative. 11 of these 14 have a minus
> sign. That's the structuring rule showing up: they're pushing money out. Which means -- and I said
> this last time -- the flagged accounts, the mule ring, will not be on the 'takes in far more than
> it sends' list. This time I didn't have to reason it out, it's sitting in the footer."

**6. Cross-check against one account.**

> "One count, against something I know. Inspector on the merchant: In 907, Out 0, All 907.
> 'Totals: Money in $440,783.97, Money out $0.00, summed by graphty from transfers-2026-03.csv.'
> 907 links in matches the result panel. $440,783.97 matches the top of the net column. And it says
> it summed it, and from which file. That's what I needed. I'd still run the pandas once on the
> first go, to trust it the second time."

> "One thing: the Statistics panel on the graph still said 'amount, not used yet' on the screen
> where I typed 'money'. I've now summed amount three ways. 'Not used yet' by what? It means no
> measure uses it as a weight, I think. But I just used it. Read cold, that line contradicts the
> result."

**7. The two catalogs, afterwards.**

> "Out of curiosity: main menu, Algorithms. Centrality, Community, Path, Structure, Flow,
> Prediction. No Degree. The 'Run a measure...' button in Results has a Degree group at the top --
> Links (count), Total confidence, on the protein one. So the list you get depends on which door you
> came in by. Last round I went to the main menu first and found nothing. If I'd done that today
> I'd have found nothing again and gone to the table. I only got here fast because I typed."

**8. Finishing.**

> "What I'd send: sorted by Money in minus out, top ten, three money columns plus kind, export
> table as CSV. The mock only draws the Money in run with six rows, so I can't read the ten names
> and their outs off the screen. From what is drawn I'd bet the top ten are all merchants, and
> #1 is ACC-393859 at +$440,783.97 net. I'm not putting a list of ten in an email off a bet --
> but the path is there and I'd have it in five minutes on the real thing."

She does not read out ten accounts: the drawn screens show the full top of the Money in ranking
(six rows) and the net only for the 14 flagged accounts and the one merchant she inspected.

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 5.**

> "Five. It went from 'can't do it' to 'type money, pick the one that says in less out'. The names
> tell me what's money and what's a count, and the inspector told me it summed the file itself and
> the numbers matched. Not a six because the date on the result is the run date, not the data
> range; the heading on the top list reads like it's ranked by links; the main menu's Algorithms
> list doesn't have it at all; and the Statistics line still says amount isn't used after I used
> it. None of those stopped me. Each of them is a thing I'd have to explain to a junior."

**Would she use this instead of her current tool?**

> "For this exact question, it ties my notebook, and it wins on the next step: I click the top
> account and see who paid it. That's the thing pandas is bad at. So for a money-in, money-out ask
> I'd start here, export the CSV, and keep the notebook for the record. Instead of the notebook?
> No -- my notebook remembers every query I ran, and I haven't seen this keep 'sorted by net,
> personal only' as something I can re-run on April's file. And it's still not on the approved
> list. Real data doesn't go in until it is."

## Problems, in her words

| Where | What | Severity (1-4) |
|---|---|---|
| Money in result, title and scope line | The only date on the finished result is the run time ("Money in, Sep 29 10:31"). The data's range (March 2026, UTC) appears only in the project title. A pasted panel or a CSV read cold can be mistaken for a Sep 29 range. | 2 |
| Main menu, Algorithms | Has no Degree group, so Money in / out / in minus out are not there; the Results panel's "Run a measure..." catalog does have Degree. Coming in by the main menu, as she did last round, still finds nothing. | 2 |
| Graph Statistics line | Still reads "amount, not used yet" on the same screen where Money in, Money out and the net sum amount. The line means "no measure uses it as a weight", but read cold it contradicts the result. | 2 |
| Money in result, top list heading | "Top accounts with Links in (count)" reads as if the list is ranked by link count; it is ranked by money, with the count shown alongside. | 1 |
| Table group header | The money columns sit under "Weighted degree sum of amount (USD)". The columns themselves are plain English; she wants the export to say "Money in", not "weighted degree". | 1 |
| Rounding | $440,784 on the result list, 440,783.97 in the table and $440,783.97 in the inspector; the table drops the dollar sign. Same number, three spellings. | 1 |
| Keeping the query | Nothing she saw keeps "sorted by Money in minus out, personal only" as something to re-run on next month's file. | 2 |
| No ratio | "Far more in than out" could be a difference or a ratio. Only the difference is offered; an account with $5 out and $50,000 in and one with $0 out rank the same way. She would add the ratio in a spreadsheet. | 1 |

## What worked, in her words

- "I typed 'money' and got exactly the three things I wanted, with one line each saying what they
  sum. That's the closest thing to a query box this has, and it worked."
- "Counts are called counts. 'Counts of transfers, not money' as a group title. Nobody can hand
  their manager a transfer count thinking it's dollars."
- "The same names in the command box, the table's New column menu and the inspector. Money in,
  Money out, Money in minus out. I didn't have to learn two vocabularies."
- "'#3 by money in and #37 by Links in (count): 37 transfers, fewer and larger.' That's an analyst
  sentence. I'd paste it."
- "The inspector says 'summed by graphty from transfers-2026-03.csv', and 907 links, $440,783.97
  in, $0.00 out agreed with the table. The counts agree with each other again."
- "The footer total on the flagged accounts: they net negative, 11 of 14. It shows the mules won't
  be on this list without me having to say it."
- "It ran instantly. No spinner, no going white."
