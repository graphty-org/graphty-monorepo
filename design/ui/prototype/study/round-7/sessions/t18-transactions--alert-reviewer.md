# Session: t18-transactions, alert reviewer (Nadia, level-1 transaction monitoring analyst)

Task as given: "The transfers came as one spreadsheet that only has account numbers. The bank's
account list, which says for each account whether it belongs to a business, a person or a
merchant, and which country it is in, is a second spreadsheet. Bring both in so each account
carries its details, and treat business, personal and merchant accounts as different sorts of
account."

Start screen: shots/tasks/t18-transactions/01.png -- the import screen ("Open as a new graph")
with transfers-2026-03.csv already set up as edges from from_account to to_account, 3,000 ids
found, Load button bottom right.

All renders are in tmp/round-7-sessions/t18-transactions--alert-reviewer/. Every command was run
from design/ui/prototype as
`timeout 120 node app-b/study.mjs --try <abs path>/NN.png task:t18-transactions <steps>`.

## Steps

**01 (start).** "Okay, the transfers file is already in, from account to account. I need the
account list. There's a plus next to 'Tables'. I'll hover it first."

**02** `--hover "Add"` -> tooltip "Add a table". "That's it."

**03** `--click "Add a table"` -> a small menu: File..., From a URL..., Paste...
"It's a file on my desktop. File."

**04** `--click "Add a table" --click "File..."` -> a little black message at the bottom says
"Opens the file picker". Nothing else changes; still only one table in the list.
"It says it opens the file picker but nothing opened and no second table showed up. Maybe the
window popped up somewhere else. I'll try Paste, I can copy the list out of Excel."

**05** `--click "Add a table" --click "Paste..."` -> the title at the top changed to
"Les Miserables", my transfers table is gone from the list, and there is a block of XML I never
pasted, with a warning that Load is off until I pick GraphML or GEXF.
"Wait. I didn't paste anything. Where did my transfers go? That's scary -- did I just lose the
file? I'm not touching Paste again. Starting over."

**06** `--click "Add a table" --click "From a URL..."` -> the header now says "Add to
Transfers", and the table list has three entries: accounts (3,000), transfers (9,113) and
structuring alerts (14). An address I never typed is filled in
(alerts.bank.example/structuring/2026...), showing 14 structuring alerts.
"Huh. It pulled in our structuring scenario by itself. I know that rule -- three or more
transfers of 9,000 to 9,999 out in 30 days -- but I didn't ask for it. What I want is
'accounts', 3,000, which matches the 3,000 account ids. Clicking it."

**07** `... --click "accounts"` -> accounts-2026-03.csv: id (Key), kind, country, riskScore,
flagged, alertRule, alertTime, all marked "Attribute". "Type: account" at top right. Report:
"3,000 rows; every key is unique."
"There's the kind column -- business, personal. Country too. But 'Type: account' means every
account is one sort. I need business, personal and merchant split."

**08** `... --click "Type"` -> nothing happens.

**09** `... --click "account"` -> dropdown: Existing types (none yet), New type: account,
Rename type... "That's just one name for the whole file. Renaming doesn't split anything. Under
each column there's a grey 'Attribute'; maybe the kind column can be something else."

**10** `... --click "kind"` -> nothing happens.

**11** `... --click "Attribute"` -> menu for the kind column: Key, Links to ->, Subtype, Name,
Time / Weight / Position (grayed, "needs a Number"), Attribute (checked).
"Subtype. Business is a sub-sort of account, I guess. Closest thing to 'different sorts'."

**12** `... --click "Subtype"` -> kind now shows "Subtype". The line at the top reads
"account (3,000; kind: merchant | business | personal) --transfers--> account ...". Type line:
"account; subtypes from kind: merchant (60), business (330), personal (2,610)". Report: "kind
makes 3 subtypes of account ... Every node stays type account, keyed by id, so links and notes
still point at account."
"Merchants show up even though the first rows were only business and personal. 60 + 330 +
2,610 is 3,000. Good. Country is just an attribute, which is fine, I only need it carried. The
structuring alerts table still bothers me; I didn't add it. I'll just Load and look."

**13** `... --click "Load"` -> the graph. Sources: accounts-2026-03.csv (3,000 nodes),
transfers-2026-03.csv (9,113 edges), alerts.bank.example/struct... (14 rows). Attributes list
kind as "Color (kind), Fi...", and country, riskScore, flagged, alertRule, alertTime under the
accounts. Top bar: "812 of 3,000 nodes". Filters: "amount is at least 1,000" ticked on, "kind is
not merchant" off. The picture is all gray hexagons; a bubble says "Nothing is colored or sized
by a row". Right panel: "Graph from 2 tables".
"It loaded. But: I never set an 'amount at least 1,000' filter, and it's hiding most of my
accounts. It says 'from 2 tables' and the left lists three. Kind says it's used for color but
everything's gray and it tells me nothing is colored. Did I change the data or only the view? I
can't tell. I'll open the Table to check one account."

**14** `... --click "Table"` -> nodes table, "3,000 nodes (before the filter) from the node file
accounts-2026-03.csv": id, links in, links out, links total, kind, country. ACC-633005 business
GB, ACC-325714 business MX, and so on.
"Okay. Each account has its kind and country next to its transfers. That's what I was asked.
Stopping."

## Wrap-up

**Did I succeed?** I think so. Accounts were matched to transfers on the account id, every
account shows its kind and country in the table, and kind is set as "Subtype" with merchant,
business and personal counted. I'm not fully sure "subtype" is what was meant by "different
sorts", and I ended up with an extra alerts table and a filter I never asked for.

**Single Ease Question: 4 / 7.** The kind-to-Subtype step was quick once I found the grey
"Attribute" under the column, and the report said in plain words what it would do. Getting the
second file in was the bad part: "File..." showed a message and did nothing, "Paste..." swapped
my whole graph for something called Les Miserables, and I only got the account list through
"From a URL...", which filled in an address I didn't type and added a third table I didn't want.

**Would I use this instead of my current tool?** Not for clearing alerts. In the case system I
already see the customer's type and country on the profile; I don't need to join two
spreadsheets. Bringing the files together took longer than an alert should, and I came out with
a filter and an extra table I can't explain to QA. If Sarah sent me a graph already built like
this, I'd look at it for an alert where the counterparties matter. Building it myself, no.

## Problems noticed (in my words)

- "File..." in Add a table only showed "Opens the file picker" and added nothing.
- "Paste..." replaced my graph (title changed to Les Miserables, transfers gone) with text I
  never pasted. Felt like losing work.
- "From a URL..." filled in an address on its own and added a structuring alerts table nobody
  asked for, plus the accounts table.
- The Type dropdown only offers one name for the whole file; how to split by a column is hidden
  under a grey "Attribute" label on the column.
- After Load: a filter "amount is at least 1,000" was already on (812 of 3,000 nodes) that I did
  not set.
- "Graph from 2 tables" on the right while the left lists 3 sources.
- kind says it is used for color, but the graph is all gray and says "Nothing is colored or
  sized by a row".
