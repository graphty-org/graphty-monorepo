# Session: Analyst Alex -- bring April's transfers in alongside March's

Task as given by the moderator: "Bring the April transfers you were just sent into this project
alongside March's. The data on screen is a sample: one month of card and bank transfers between
accounts. If that is not your line of work, treat the accounts as your own things (suppliers,
customers, hosts, genes) and the transfers as what passes between them."

Start screen: shots/tasks/t28/01.png. Renders are in
tmp/round-7-sessions/t28--analyst-alex/ (01.png to 15.png). All commands were run from
design/ui/prototype.

## Think-aloud

**Start (shots/tasks/t28/01.png).** "OK, March is loaded: accounts-2026-03.csv and
transfers-2026-03.csv under Sources, 3,000 accounts, 9,113 transfers, and a filter on amount.
There's a plus next to Sources, so that's my first guess for adding April. 'Local only' at the
top is good. I'm assuming that means it doesn't go anywhere."

**01.** `timeout 120 node app-b/study.mjs --try .../01.png task:t28 --hover "Add source"`
-> "nothing on screen is called 'Add source'". "Guessed the name wrong, fine."

**02.** `... --try .../02.png task:t28 --hover "Add"`
-> The tooltip says "Add data to this graph". "That's exactly what I want."

**03.** `... --try .../03.png task:t28 --click "Add data to this graph"`
-> A menu with File..., From a URL..., Paste..., and Set collection.... "I have no idea what a
'set collection' is. April came as a file, so File."

**04.** `... --click "Add data to this graph" --click "File..."`
-> "Choose a file", offering a data file (CSV, JSON, GEXF or GraphML), a recipe, or a style file.
"Data file."

**05.** `... --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"`
-> An import screen. "Hang on. The header says 'Open as a new graph'. I clicked 'Add data to
THIS graph'. And the file it's showing me is transfers-2026-03.csv, which is March, not April.
The dates in the preview are all 2026-03. The accounts table isn't here either, so it says the
ids 'become nodes of type node', and I'd lose the account kinds. The filter chip at the top went
from '812 of 3,000 nodes' to 'Full graph' as well. I'm not pressing Load on this. If I did I'd
end up with a second copy of March in a new graph, and that's exactly the kind of thing that ends
up in a report wrong."

**06.** `... (same steps) --click "Open as a new graph"`
-> Nothing changed. "So that's just a title, not a switch. I can't tell it 'no, add to the one I
have'."

**07.** `... (same steps) --hover "Add table"` -> nothing called that.

**08.** `... (same steps) --hover "Add"` -> The plus next to Tables is "Add a table". "Maybe April
is another table here."

**09.** `... (same steps) --click "Add a table"` -> File..., From a URL..., Paste....

**10.** `... (same steps) --click "Add a table" --click "File..."`
-> A little popup at the bottom says "Opens the file picker" and nothing else happens. "Dead
end. I never got to pick April."

**11.** `... --try .../11.png task:t28 --hover "More"`
-> That's the "More actions" on the right panel, not the "..." on my transfers file. "Not what I
meant."

**12.** `... --try .../12.png task:t28 --click "transfers-2026-03.csv"`
-> "Edit: transfers". Both of my tables are on the left, accounts 3,000 and transfers 9,113, and
the top says account (3,000) --transfers (9,113)--> account (3,000). "OK, this is the real setup
of my project. That's better. If April goes anywhere, it goes here."

**13.** `... --click "transfers-2026-03.csv" --click "Add a table" --click "File..."`
-> "Opens the file picker" again, and nothing. "Same wall. And even if it had opened, I don't
know whether April would become a second 'transfers' table or be appended to March's. Nothing
on screen says 'append rows' or 'same columns as transfers'. I'd want it appended, with a month
column or the timestamps telling them apart, and the counts to go up so I can check them
against SQL."

**14.** `... --click "Add data to this graph" --click "Set collection..."`
-> "Out of ideas, so I tried the jargon one." It's the same "Open as a new graph" screen with the
March file. "No help at all."

**15.** `... --try .../15.png task:t28 --click "Transfers, March 2026"`
-> The project menu: Rename, Save, Save as, Export, Apply recipe or style file, Version history,
Close project. "Nothing about adding a month. 'Apply recipe' sounds like next month's rerun,
not putting April next to March. I'm done. That's well past my five minutes."

## Outcome

- **Did I succeed?** No. I gave up. April never got in. The only import I could reach showed the
  March file under the heading "Open as a new graph", so I wouldn't press Load. Both "Add a table"
  file choices did nothing I could see.
- **Single Ease Question:** 2 out of 7. Finding "Add data to this graph" was easy. Everything
  after it pointed me at a new graph, at March's file, or at nothing.
- **Would I use this instead of what I use now?** Not for this job. Today I'd `pd.concat` March
  and April in pandas, write one CSV and reload it in Gephi. That's two minutes and I know the
  counts. The edit screen showing both tables and the account -> account line with counts is
  honestly better than Gephi's import, and if "add April" landed there with a match report
  saying how many new accounts and how many new transfers, I'd use it. As it is, I can't even
  tell whether "add" means a new graph or my graph.

## What got in my way, in my words

1. I clicked "Add data to this graph" and got a screen titled "Open as a new graph". Which is it?
2. The import screen showed transfers-2026-03.csv, the March file I already have, not the file I
   wanted to add. It looked like it was about to load March twice.
3. The accounts table and the filter disappeared on that screen ("nodes of type node", "Full
   graph"), so loading it would have thrown away my setup.
4. "Add a table" then File... only showed "Opens the file picker". No file ever came up.
5. Nothing anywhere says "append" or "add rows to transfers", and nothing says what happens to
   accounts that show up in both months.
6. "Set collection" means nothing to me.
7. The right place, the edit screen with both tables, was only reachable by clicking the
   file name. I found it by accident.
