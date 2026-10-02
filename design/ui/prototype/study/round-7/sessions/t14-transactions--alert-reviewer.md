# Session: transfers and account list (alert reviewer)

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).

Task as given: "You were sent this month's transfers as one spreadsheet, and the bank's account
list as a second spreadsheet. Bring both in so each transfer links the paying account to the
receiving account, with the account details attached, and check it before you go on."

Start screen: shots/tasks/t14-transactions/01.png -- an import screen titled "Open as a new
graph" with one table, transfers-2026-03.csv (9,113 rows), already set up as node-to-node edges.

All commands run from design/ui/prototype; renders in
tmp/round-7-sessions/t14-transactions--alert-reviewer/. Prefix for every command:
`timeout 120 node app-b/study.mjs --try <render> task:t14-transactions`.

## Steps, thinking aloud

1. `01.png --hover "+"` -- result: nothing on screen is called "+".
   "Transfers are in, 3,000 ids. The account list isn't. There's a plus by Tables; what's it called?"

2. `02.png --hover "Add"` -- tooltip "Add a table".
   "Good, that's what I want."

3. `03.png --click "Add a table"` -- menu: File..., From a URL..., Paste...
   "It's a file on my desktop. File."

4. `04.png --click "Add a table" --click "File..."` -- a toast "Opens the file picker"; no table added.
   "It says it opens the file picker and then... nothing. No accounts table. I'll try Paste,
   I usually copy out of Excel anyway."

5. `05.png --click "Add a table" --click "Paste..."` -- the whole screen changed: title "Les
   Miserables", one table "Pasted text" holding XML I never pasted, a warning to choose GraphML or
   GEXF, Load greyed out. My transfers table is gone from the list.
   "What? Les Miserables? Where are my transfers? Did it throw them away? I'm backing out of that."

6. `06.png --click "Add a table" --click "From a URL..."` -- screen "Add to Transfers" with three
   tables: accounts 3,000, transfers 9,113, structuring alerts 14 (fetched from
   alerts.bank.example). Top line: "account (3,000) --transfers (9,113)--> account (3,000)
   account (3,000) + structuring alerts columns". Report: "Adds 2 columns to account: 14 of 14
   matched."
   "Now there's an accounts table I didn't add, and an alerts feed I didn't add either. I know those
   alerts -- 9,000 to 9,999, structuring. But the top line is what I want: transfers between
   accounts."

7. `07.png ... --click "accounts"` -- accounts-2026-03.csv, 3,000 rows: id (Key), kind, country,
   riskScore, flagged, plus alertRule and alertTime merged in. "3,000 rows; every key is unique."
   "That's the account list. Details are there. Unique keys, good. Now do the transfers actually
   hit these?"

8. `08.png ... --click "transfers"` -- columns now "From -> account", "To -> account"; amount turned
   into Weight ("Higher means Stronger"); timestamp into Time. Report: "9,113 rows; every row has
   both ends. ... 9,113 rows became 9,113 edges."
   "It says account now, not node, so they're tied together. But nothing says 'every from_account
   was found in the account list' or '0 unknown accounts'. That's what QA asks. 3,000 on both sides
   and 3,000 in the list -- I'll take that as matched, but it's me guessing. And I never asked for
   amount to be a weight. Leaving the alerts table in, it's my kind of data."

9. `09.png ... --click "Load"` -- graph screen. Sources: accounts-2026-03.csv (3,000 nodes),
   transfers-2026-03.csv (9,113 rows, 9,113 edges), alerts.bank.example/struct... (14 rows).
   Header "812 of 3,000 nodes"; a filter "amount is at least 1,000" already ticked; summary says
   "Graph from 2 tables"; Weak components 1.
   "812 of 3,000? I lost two thousand accounts? ... Oh, a filter is on, amount at least 1,000. I
   never set that. Left side still says 3,000 and 9,113, so I think it's only the view, not the
   data. And it says from 2 tables when three are listed."

10. `10.png ... --click "Edges"` -- edges table "9,113 edges (before the filter)", columns
    from_account, to_account, timestamp, amount (4 of 4); "Sum of amount, all 9,113 rows: 14,156,522".
    "The total I can tie out to the spreadsheet, good. But no country or risk score on the transfer
    row. I expected the payer's and receiver's details next to each transfer."

11. `11.png ... --click "Nodes"` -- "3,000 nodes (before the filter) from the node file
    accounts-2026-03.csv": id, links in, links out, links total, kind, country ... ACC-633005:
    0 in, 15 out, business, GB.
    "There they are, on the accounts. Matches the list. To see a payer's details for one transfer I
    look the account up here -- copy-paste again, but at least it's one screen. I'm done."

## Outcome

- Do I think I succeeded? Mostly. Both files are in, the transfers point from account to account,
  and the account details are on the accounts. I checked unique keys, row counts and the amount
  total. I could not find a line telling me how many transfers did NOT find their account, so the
  "every transfer matched" part is my inference from 3,000 = 3,000.
- I got the account list in by accident: File did nothing, Paste swapped my whole graph for
  something called Les Miserables, and "From a URL" is what brought the accounts in, plus an alerts
  feed I didn't ask for.
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? Not for clearing alerts -- the case system and a
  spreadsheet do that in five to ten minutes. Maybe for the odd alert where counterparties matter,
  if it told me plainly "N transfers, N matched, 0 unknown accounts" and didn't switch on filters or
  pull in feeds I didn't choose. QA wants what I did written down, and here things happened that I
  didn't do.
