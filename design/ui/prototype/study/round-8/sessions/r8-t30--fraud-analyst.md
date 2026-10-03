# Session: append April transfers to March's table -- fraud analyst (Sarah)

Task as given: "March's card transfers are open (example data if you do not work in banking).
April's transfers have arrived as a second file with the same columns. You want the one table of
transfers to hold both months from now on, keeping everything you have built."

Mode: first impression, not mandated. Renders are in
design/ui/prototype/tmp/round-8-sessions/r8-t30--fraud-analyst/. All commands were run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:r8-t30 ...`; the
steps are listed below.

## Start (shots/tasks/r8-t30/01.png)

"Transfers, March 2026." A big colored hairball, a Louvain legend I didn't ask for, and a list on
the left: Selection, Notes, Louvain, Links in (count), Everything. That list is the stuff I've
built. I need to keep it. I'm adding data, so I look for a data area -- there's "Data" on the left
rail.

## 02 -- `--click "Data"`

Now I see Sources: accounts-2026-03.csv (3,000 nodes) and transfers-2026-03.csv (9,113 rows).
Below that, a filter "amount is at least 1,000" and the attributes. Good, that's where the
files live. Each file has three dots. That's my menu.

## 03 -- `--click "Data" --hover "transfers-2026-03.csv"`, then `--click "Data" --click "More"`

Resting on the file name tells me nothing. Clicked something called "More" -- that opened the
graph's menu on the right (Select all, Re-run layout, Clear graph data). Not the file. Wrong
dots.

## 04, 05 -- `--click "Data" --click "transfers-2026-03.csv"` (and clicked the file name again)

Clicking the file row opens "Edit: transfers" with the column mapping and a match report:
"9,113 rows became 9,113 edges." Readable, I like the match report. But nowhere here to add
another file. The "+" next to Tables would make a new table, and I don't want a new table, I
want one table. Clicking the file name at the top does nothing. Back out.

## 06 -- hovered "Options", "Actions", "Menu"; then `--click "Data" --click "Actions for transfers-2026-03.csv"`

Resting the pointer on the dots by the transfers file says "Actions for
transfers-2026-03.csv". The menu: Rename, Replace with file..., Add rows from file..., Edit
source..., and a grayed Remove with a paragraph about why. "Add rows from file" is exactly my
words. Good. "Replace" would kill March, so not that.

## 07 -- `... --click "Add rows from file..."`

Opens "Add to transfers" with transfers-2026-04.csv already in it. Header: "account (3,000 + 132
added) --transfers (9,113 + 8,370 added)--> account". Match report: "transfers-2026-04.csv has
the same 4 columns as transfers." Choice "Add these rows to transfers" (selected) or "Load as its
own table". "8,370 rows to add - 0 repeated rows - 132 new accounts." And a link to replace
March instead, which "drops March's rows". This is a good screen. Numbers I can check. Two
things bother me:
- 132 new accounts come in from transfers alone. They won't be in the accounts file, so no KYC,
  no country, no risk score. I'd want a list of those 132 before I do anything; that's exactly
  where a mule hides. Nothing here lets me see them.
- The left list shows "transfers-202..." as its own row under Tables, right under "transfers".
  So is April its own table or not? The toggle says added, the list says separate.
I clicked Add.

## 08 -- `... --click "Add"`

Back on the graph. My Louvain coloring is gone. "Links in (count)" is gone. The left list is
only Selection, Notes, Everything and "Analyze to add results here". The chart is a gray
honeycomb with "Nothing is colored or sized by a row". And the summary on the right still says
3,000 nodes and 9,113 transfers -- the March numbers. So April didn't land, and my work did not
survive. That is the exact opposite of what I asked for.

## 09 -- `... --click "Add" --click "Data"`

Data panel: sources still only list the March file at 9,113 rows. No April. Filters: "No
filters." My "amount at least 1,000" filter is gone too. Attributes: the Louvain result is gone.

## 10 -- `... --click "Add" --hover "Undo" --click "Undo"`

Undo (Ctrl+Z). Pressed it. "Nothing to undo." So I can't even get my March setup back. On a real
case that is me rebuilding an afternoon's work, and explaining to my reviewer why the picture
changed.

## 11-14 -- tried again carefully

`... --click "Add rows from file..." --click "Add these rows to transfers" --hover "Add"`: the
Add button's tooltip is "Add Enter". `--key Enter` only re-confirmed the choice with a toast:
"These rows are added to transfers. Set aside: transfers-2026-04 as its own table. Undo".
(That "Set aside ... as its own table" bit confused me -- set aside means what, it's not
added?) `--click "Add Enter"`: nothing on screen is called that. `--click "Add"` after
explicitly choosing "Add these rows to transfers": same as before -- everything I'd built is
gone, still 3,000 nodes and 9,113 transfers.

I stop here.

## Verdict

- Succeeded? No. As far as the screen tells me, April never got into the table (still 9,113
  transfers, no April source) and my Louvain coloring, my "Links in" layer and my amount filter
  were wiped, with nothing to undo. If April did go in, the screen gives me no way to know it.
- Single Ease Question: 2 of 7. Finding "Add rows from file" was fine once I found the right
  three dots, and the preview screen was the best part. The ending wrecked it.
- Would I use this instead of my current tool? No. Today I paste April under March in Excel and
  my pivot just refreshes; nothing I built goes away. A tool that loses my filter and my coloring
  when I add a month of data -- and won't undo it -- can't be trusted with a case file. If the
  Add had kept my work, shown "17,483 transfers" afterwards, listed April under Sources, and let
  me see the 132 new accounts, I'd call that fine, maybe better than i2's import wizard.

## Problems, in my words

1. After Add, everything I had built (Louvain coloring, Links in layer, amount filter) was gone
   and the counts were still March's. Undo said nothing to undo. Severe.
2. Two sets of three-dot buttons look the same; the first I tried was the graph's menu with
   "Clear graph data" in it. I had to rest the pointer on each to find the file's own menu.
3. In the add screen, April shows as its own row under Tables while the choice says "added to
   transfers", and the toast says "Set aside ... as its own table". Is it one table or two?
4. 132 new accounts arrive with no account details and I can't list them before adding.
5. "Add" says Enter in its tooltip, but Enter only confirmed the choice, it did not add.
