# Session: send this month's flagged-accounts spreadsheet -- Analyst Alex

Task as given: "Last month you sent the flagged accounts to the case team as a spreadsheet. Send
the case team this month's version of it. The data on screen is a sample: one month of card and
bank transfers between accounts."

Start screen: shots/tasks/t17-transactions/01.png. Renders are in
tmp/round-7-sessions/t17-transactions--analyst-alex/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <render> task:t17-transactions ...`;
only the steps are listed below.

## Start

Project is "Transfers, March 2026". Two files, accounts-2026-03.csv (3,000 nodes) and
transfers-2026-03.csv (9,113 rows, 9,113 edges). Good, row count equals edge count, nothing
dropped. "Local only" up top, fine, that answers my first question. There's a filter already on,
"amount is at least 1,000", 812 of 3,000 nodes. Hm. Was that on last month? I don't know. The
accounts table has a "flagged" column, so the obvious plan is: filter to flagged, open the table,
export to CSV. Before that -- "last month's version" -- maybe I saved something last month.

## Step 1 -- Views (01.png)

Steps: `--click "Views"`

"No saved views." OK, so I didn't save a view last month. Moving on.

## Step 2 -- Table (02.png)

Steps: `--click "Table"`

Table opens under the graph. "3,000 nodes (before the filter)". Columns: id, links in, links out,
links total, kind, country. I'd need flagged in here too, it says 10 of 12 columns. Fine. Rows
381 to 420 of 3,000 -- odd that it opened in the middle, but whatever. I need to cut it down to
the flagged ones first.

## Step 3 -- click "flagged" in the attribute list (03.png)

Steps: `--click "flagged"`

I clicked flagged and the right panel shows... "amount", the transfer amount. Not flagged. The
flagged row is highlighted on the left but the panel is about a different column. That's the kind
of thing that ends up in a report wrong. I didn't get anything about flagged -- how many are
flagged, true/false counts, nothing.

## Step 4 -- add a filter (04.png, 05.png, 06.png)

Steps: `--click "Add filter"`; then `--click "Add filter" --click "By an attribute or computed value"`;
then the same plus `--click "flagged"`

The plus next to Filters adds a "New step" straight away -- "Kept all 812 nodes" -- before I've
said what it does. Menu: "By an attribute or computed value", top of a computed value, largest
component, k-core. Attribute one. Then a field list, flagged is there. I click flagged and... the
step still says "Kept all 812 nodes" and the right panel jumped to "amount" again. So the field
didn't take, or I picked the wrong flagged. Two "flagged" on screen, left list and the dropdown.
I don't trust this filter.

Also it's stacking on top of the amount >= 1,000 filter. Last month did I send flagged accounts
with big transfers, or all flagged accounts? The case team would want all of them, I'd think. I'd
have to turn that filter off and I'm not sure it was meant to be on.

## Step 5 -- looking for Export (08.png, 09.png, 10.png)

Steps: `--click "Table" --click "More"`; `--click "Menu"`; `--click "Transfers, March 2026"`

The dots on the table opened a menu about the graph -- select, layout, clear graph data. No
export. Hamburger menu: new, open, select where, settings. No export. The project name dropdown
has it: Save, Save as, Export, "Apply recipe or style file", Version history. OK, Export is under
the project name. I'd not have looked there first, it took me three tries.

## Step 6 -- Export dialog (11.png)

Steps: `--click "Transfers, March 2026" --click "Export..."`

Opens on Image. The preview is some other graph with orange nodes and names on it, not my
transfers. Weird. But there's "Recent exports" in the list, and "last month's version" is
exactly what that sounds like.

## Step 7 -- Recent exports (12.png)

Steps: add `--click "Recent exports"`

One file: case-acc-233575_ring-pagerank_2026-03.csv. "Data, CSV, 14 accounts of the Mule ring and
the methods file -- Sep 28 -- made from March data". Button: "Export again, on April data".

OK so "case" -- that's the case team file. But it says "14 accounts of the Mule ring" and
"ring-pagerank". Is that "the flagged accounts"? I'd have said flagged meant the flagged column.
Maybe last month I picked the ring by hand and that is what got flagged. I'll go with it, it's the
only case file.

But: "on April data"? My project is "Transfers, March 2026", the sources on the left are
accounts-2026-03 and transfers-2026-03. Where is April? If it re-runs on what's loaded, that's
March again, which is what it was made from. The button and the screen disagree. If I'd loaded
April it should say 2026-04 on the left.

## Step 8 -- Export again (13.png, 14.png)

Steps: add `--click "Export again, on April data"` (once, then twice)

A dark tooltip-looking bar: "Export again on the current data: the same settings, a new file
named for the month, the earlier file kept." That's it. No new file in the list, still "1 file",
no download, no "saved". Clicked it twice. Nothing changed. Did it export? I genuinely don't know.
I'd go look in Downloads, and if there's nothing I'd assume it didn't.

## Step 9 -- try Data export by hand (15.png, 16.png)

Steps: `--click "Transfers, March 2026" --click "Export..." --click "Data"`; then add
`--click "Full graph"`

Plan B, build it myself. Data says "Full graph, 77 nodes, 254 edges". I have 3,000 nodes and 9,113
edges. 77? That's not my data. It also talks about Louvain community and PageRank, which I never
ran here. Table defaults to Edges -- I want accounts, i.e. Nodes, and the warning even says so.
Scope: "Full graph" or "Watchlist, 5 nodes". No "flagged", no "what the filter keeps", no "what's
in the table". So I can't get the flagged list out this way either.

## Step 10 -- click the old file name (17.png)

Steps: `--click "Transfers, March 2026" --click "Export..." --click "Recent exports"
--click "case-acc-233575_ring-pagerank_2026-03.csv"`

Hoping to see what was in it, which columns, which accounts. Nothing happens. Stopping.

## Wrap-up

**Did I succeed?** Probably not. I found what looks like last month's file and a button that says
it'll redo it, but clicking it gave me one line of text and no file, and the button says "April
data" while everything on screen says March. And I'm not even sure that file is "the flagged
accounts" -- it says Mule ring, 14 accounts, PageRank. Building it myself failed: the flagged
filter didn't take, and the data export shows 77 nodes for a 3,000-node graph and has no "flagged
only" scope. I would not send anything to the case team off this.

**Single Ease Question:** 2 out of 7. The longest part: finding Export (under the project name,
third place I looked), then not being able to tell whether the re-export happened.

**Would I use this instead of what I do now?** Not for this. Right now this is pandas:
`df[df.flagged]`, `to_csv`, done in a minute, same columns as last month because the script is the
same. The "export again next month" idea is exactly what I want -- that's the Gephi-half-by-hand
problem -- and if that button actually produced a file, named for the month, with a count I could
check ("14 accounts last month, 17 now"), I'd use it. But a 77-node count on my 3,000-node graph is
the kind of thing that ends up in a report wrong, and that alone would send me back to Python.

## Problems seen (in my words)

1. "Export again, on April data" did nothing visible: no file added to the list, no download, no
   confirmation. Only a one-line note. (13.png, 14.png) -- severe.
2. The button says April; the project title and both source files say March / 2026-03. Which data
   does it run on? (12.png) -- severe.
3. Data export says "Full graph, 77 nodes, 254 edges" and mentions Louvain and PageRank on a
   3,000-node, 9,113-edge graph where neither was run. Image preview shows a different graph.
   (11.png, 15.png) -- severe, trust-breaking.
4. Clicking "flagged" (in the list, and as a filter field) showed "amount" in the right panel; the
   new filter stayed "Kept all 812 nodes". (03.png, 06.png) -- severe.
5. Data export scope has no "flagged", "filtered" or "what's in the table" option; only full graph
   or a 5-node watchlist. Table defaults to Edges when accounts are what goes to a case team.
   (16.png) -- high.
6. Last month's file is described as "14 accounts of the Mule ring ... ring-pagerank", not as
   flagged accounts; I couldn't open it to see what was in it. (12.png, 17.png) -- medium.
7. Export is only under the project-name dropdown, not the main menu or the table's own menu.
   (08.png, 09.png, 10.png) -- medium.
8. The "amount at least 1,000" filter was already on, and nothing says whether last month's file
   used it. (01.png) -- low.
