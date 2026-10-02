# Session: send this month's flagged-accounts spreadsheet -- Dana Okafor (supply chain risk analyst)

Task as given: "Last month you sent the flagged accounts to the case team as a spreadsheet. Send
the case team this month's version of it. The data on screen is a sample: one month of card and
bank transfers between accounts. If that is not your line of work, treat the accounts as your own
things (suppliers, customers, hosts, genes) and the transfers as what passes between them."

Start screen: shots/tasks/t17-transactions/01.png. Renders: tmp/round-7-sessions/t17-transactions--supply-chain-analyst/NN.png.
All commands run from design/ui/prototype with `D=$PWD/tmp/round-7-sessions/t17-transactions--supply-chain-analyst`.

## Think-aloud

**01 (start screen).** OK, so for me this is like my monthly supplier-risk list. Accounts are my
suppliers, "flagged" is my watch list. Title says "Transfers, March 2026", the two files are
2026-03. A big gray blob in the middle -- nice hairball, means nothing to me. There's a "flagged"
column on the left, good. In Excel I'd filter flagged = yes and save as. Let me find the table.

**02.** `timeout 120 node app-b/study.mjs --try $D/02.png task:t17-transactions --click "Table"`
Table opens at the bottom. "3,000 nodes (before the filter)". Columns are links in, links out --
I can't see flagged in the visible columns. "Columns: 10 of 12", there's a "..." next to it. I
want an export button on the table itself. Nothing says export here.

**03.** `... --try $D/03.png task:t17-transactions --hover "Table actions"`
-> "nothing on screen is called Table actions". OK, I don't know what that dots button is called.

**04.** `... --try $D/04.png task:t17-transactions --click "Views"`
I thought maybe last month's setup was saved as a view. "No saved views." Fine, so I didn't save
it, or somebody else did it last month.

**05.** `... --try $D/05.png task:t17-transactions --click "flagged"`
I click "flagged" under accounts and the right panel shows... "amount", an edge attribute, from
the transfers file. That's not what I clicked. Either it ignored me or it's showing me something
else. Now I trust that panel less.

**06.** `... --try $D/06.png task:t17-transactions --click "Add filter"`
The plus next to Filters. A menu: "By an attribute or computed value", "Top of a computed value",
"Largest component", "k-core" -- I'm not touching k-core. Also I notice there's already a filter
"amount is at least 1,000" on, and my new step goes underneath it. Was that on last month? I
have no idea. If I filter flagged on top of it I'll miss flagged accounts with small transfers.

**07.** `... --try $D/07.png task:t17-transactions --click "Add filter" --click "By an attribute or computed value"`
"Pick a field" list. I see flagged in it.

**08.** `... --try $D/08.png task:t17-transactions --click "Add filter" --click "By an attribute or computed value" --click "flagged"`
It went to the "flagged" on the left again and the panel shows "amount" again. The filter step
still says "Kept all 812 nodes". Didn't work. Second time this happens -- normally this is where
I'd go back to Excel. Let me look for a plain Export first.

**09.** `... --try $D/09.png task:t17-transactions --click "Export"` -> nothing called Export on
screen. No export button anywhere visible. That's a big miss for me.

**10.** `... --try $D/10.png task:t17-transactions --hover "More"` -> the dots on the right panel
are "More actions". Not obviously export.

**11.** `... --try $D/11.png task:t17-transactions --click "Menu"`
The hamburger. New project, Open, Select where, Settings, Help. No Export, no Save. In every
program I use, Export is in the File menu. Where is it?

**12.** `... --try $D/12.png task:t17-transactions --click "Transfers, March 2026"`
Ah -- clicking the project name. Save, Save as, Export (Ctrl+E), Version history. Weird place,
but there it is. I only found it by poking.

**13.** `... --try $D/13.png task:t17-transactions --click "Transfers, March 2026" --click "Export..."`
Export dialog defaults to Image. I want data. But down the side there's "Recent exports" --
that's what I want: last month's file.

**14.** `... --try $D/14.png task:t17-transactions --click "Transfers, March 2026" --click "Export..." --click "Recent exports"`
One file: "case-acc-233575_ring-pagerank_2026-03.csv -- Data, CSV, 14 accounts of the Mule ring
and the methods file, Sep 28, made from March data". And a button "Export again, on April data".
This is exactly the idea I want -- "do last month's thing again". But: the title bar and both
source files say March 2026. Where is April data? I didn't load any April file. And it's "14
accounts of the Mule ring", plus pagerank -- is that "the flagged accounts"? I'll assume that's
what I sent the case team, since it's the only one with "case" in the name.

**15.** `... --try $D/15.png ... --click "Export again, on April data"`
A dark message at the bottom: "Export again on the current data: the same settings, a new file
named for the month, the earlier file kept." The dialog didn't change. The text above the list
said it "opens the output with the same settings" -- nothing opened. What's the new file called?
How many accounts are in it this time? Where did it go -- Downloads, I guess?

**16.** `... --try $D/16.png ... --click "Export again, on April data" --click "Data"`
Checked the Data tab to see if last month's settings came across: "Full graph, 77 nodes, 254
edges". 77? The screen says 812 of 3,000. Last month's was 14 accounts. None of these numbers
agree. And there's a yellow warning about Louvain community -- I skipped it.

**17.** `... --click "Data" --click "Recent exports"`
Back to Recent exports: still "1 file". So did the April one get made or not? If it did, it
should be at the top of this list.

I'm stopping. I think I clicked the right button, but I can't confirm a file exists, what it's
called, or how many accounts are in it. I would not send the case team anything I can't open and
count first.

## Outcome

- Do I think I succeeded? Probably not, or at least I can't prove it. I found "Export again"
  and pressed it, and got a message, but no file in the list, no count, no name. And the
  "April" label doesn't match the March data on screen.
- Single Ease Question: 3 / 7. Finding Export under the project name took four tries; clicking
  "flagged" twice showed me "amount"; the end gave me no proof.
- Would I use this instead of my current tool? No, not for this. For a monthly list I keep a
  saved Excel filter or a Power BI export -- it takes two minutes and I can see the row count
  before I send it. The "Recent exports / export again" idea is genuinely good, and "saved to
  this computer only, nothing is uploaded" is the sentence my IT people want to read. But it
  needs to show me the new file, its name and how many rows it has, and it needs to agree with
  what's on screen. Until then it's a side tool.

## Problems noticed (participant's words)

1. No Export where I looked: not on the table, not in the main menu. It's hidden under the
   project name.
2. Clicking "flagged" (in the attribute list and in the filter's field picker) showed "amount".
3. "Export again, on April data" when everything on screen says March.
4. After Export again: a passing message only, the list still says 1 file, no name, no count.
5. Counts disagree: 14 accounts last month, 77 nodes in the Data export, 812 of 3,000 on screen.
6. A filter "amount is at least 1,000" was already on and I couldn't tell if it belongs in the
   case-team file or not.
7. Last month's file is called a "Mule ring" / pagerank export, not "flagged accounts" -- I had
   to guess it was the same thing.
