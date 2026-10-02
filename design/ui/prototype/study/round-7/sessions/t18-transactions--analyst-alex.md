# Session: two spreadsheets into one graph, accounts as different sorts -- Analyst Alex

Task as given: "The transfers came as one spreadsheet that only has account numbers. The bank's
account list, which says for each account whether it belongs to a business, a person or a
merchant, and which country it is in, is a second spreadsheet. Bring both in so each account
carries its details, and treat business, personal and merchant accounts as different sorts of
account."

All commands were run from `design/ui/prototype`, with
`S=tmp/round-7-sessions/t18-transactions--analyst-alex`. Every run replays from the start screen.

## Start screen

Shown: `shots/tasks/t18-transactions/01.png`. An import screen, "Open as a new graph". Left, a
"Tables" list with one table, transfers-2026-03, 9,113 rows, and a plus. The middle shows
from_account and to_account already marked "From -> node" and "To -> node", amount and timestamp
as attributes. Match report at the bottom: 9,113 rows, 3,000 ids, 9,113 edges. Load button.

Alex: "OK, transfers are in, it figured out from and to by itself, good. 3,000 accounts, 9,113
rows -- that's the shape I'd expect. 'Local only' up top, I'll take that as 'doesn't leave my
machine' -- I'd want that spelled out, but fine. Now I need the account list in as well. The plus
next to Tables, probably."

## Finding the add button

```
timeout 120 node app-b/study.mjs --try $S/01.png task:t18-transactions --hover "+"
  -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $S/02.png task:t18-transactions --click "+"
  -> nothing on screen is called "+"
timeout 120 node app-b/study.mjs --try $S/03.png task:t18-transactions --hover "Add table"
  -> nothing on screen is called "Add table"
timeout 120 node app-b/study.mjs --try $S/03.png task:t18-transactions --hover "Add"
timeout 120 node app-b/study.mjs --try $S/03.png task:t18-transactions --hover "Add a table"
```

03.png: tooltip "Add a table" on the plus. "Right, the plus. Took me a second to pin down."

```
timeout 120 node app-b/study.mjs --try $S/04.png task:t18-transactions --click "Add a table"
```

04.png: menu "File...", "From a URL...", "Paste...". "File. My account list is a CSV on my
laptop."

## Trying to add the account list

```
timeout 120 node app-b/study.mjs --try $S/05.png task:t18-transactions --click "Add a table" --click "File..."
```

05.png: a little dark toast at the bottom, "Opens the file picker". The tables list still only has
transfers.

Alex: "Opens the file picker... and then? I'd pick accounts.csv here, but nothing came back.
Still one table."

```
timeout 120 node app-b/study.mjs --try $S/10.png task:t18-transactions --click "Add a table" --click "File..." --click "accounts"
  -> nothing on screen is called "accounts"
timeout 120 node app-b/study.mjs --try $S/10.png task:t18-transactions --click "Add a table" --click "File..." --click "accounts-2026-03.csv"
  -> nothing on screen is called "accounts-2026-03.csv"
```

"Nope. OK, maybe paste. I could copy the sheet out of Excel."

```
timeout 120 node app-b/study.mjs --try $S/06.png task:t18-transactions --click "Add a table" --click "Paste..."
```

06.png: the whole thing changed. The title is now "Les Miserables", my transfers table is gone,
and there is one "Pasted text" table holding XML I never pasted, asking me to choose GraphML or
GEXF. Load is greyed out.

Alex: "Whoa. Where did my transfers go? Les Miserables? I didn't paste anything. That's the kind
of thing that makes me close the tab. Back out."

```
timeout 120 node app-b/study.mjs --try $S/07.png task:t18-transactions --click "Add a table" --click "From a URL..."
```

07.png: now the header says "Add to Transfers", and the tables list has three tables: accounts
3,000, transfers 9,113, and "structuring alerts" 14 from some bank.example URL.

Alex: "Hang on. Now there's an accounts table already, and a 'structuring alerts' thing from a
URL I didn't type. Where did accounts come from? I never managed to give it my file."

```
timeout 120 node app-b/study.mjs --try $S/08.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts"
```

08.png: accounts-2026-03.csv with id, kind, country, riskScore, flagged, alertRule, alertTime.

"That is my account list -- kind, country -- plus risk and alert columns my list doesn't have. I
don't trust this. I'm not going to build on a screen I didn't put together."

Tried the main menu in case there was an Import there.

```
timeout 120 node app-b/study.mjs --try $S/09.png task:t18-transactions --click "Menu"
timeout 120 node app-b/study.mjs --try $S/09.png task:t18-transactions --click "Main menu"
```

09.png: menu with New project, Open..., Open recent, Settings. Behind it, the Les Miserables graph
again. "No Import. And it's switched me to Les Mis again. Leave it."

## Load transfers first, then add

Alex: "Fine, maybe it wants me to load the transfers first and add the second sheet afterwards.
Gephi's like that too -- nodes table, then edges table, 'append to existing workspace'."

```
timeout 120 node app-b/study.mjs --try $S/11.png task:t18-transactions --click "Load"
```

11.png: "Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges..." with a progress bar and a
Cancel. "Good, a progress bar and a cancel. That's what I want."

```
timeout 120 node app-b/study.mjs --try $S/12.png task:t18-transactions --click "Load" --click "Data"
```

12.png: Data panel. Sources: accounts-2026-03.csv (account, 3,000 nodes) and transfers-2026-03.csv
(9,113 rows, 9,113 edges). A filter "amount is at least 1,000" switched on, 812 of 3,000 nodes.
Top bar says "812 of 3,000 nodes". Right panel: "Graph from 2 tables". Canvas is a grey hex
blob, with "Nothing is colored or sized by a row", while the attributes list says kind is
"Color (kind)".

Alex: "So the accounts file is in. I didn't add it. I guess it picked up the second CSV from the
same folder? Nobody told me that. And somebody set a filter at amount 1,000 -- I didn't. At least
the top bar says 812 of 3,000 so it isn't hiding it, I'll give it that. And 'Color (kind)' next to
kind but the picture's all grey and says nothing is coloured. Which is it?"

```
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --click "Add a source"
  -> nothing on screen is called "Add a source"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --click "Add source"
  -> nothing on screen is called "Add source"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --click "Add a table"
  -> nothing on screen is called "Add a table"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --hover "Add data"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --hover "Add"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --hover "Import"
  -> nothing on screen is called "Import"
timeout 120 node app-b/study.mjs --try $S/13.png task:t18-transactions --click "Load" --click "Data" --hover "Add data"
```

13.png: tooltip "Add data to this graph" on the Sources plus. "OK, so this plus is 'Add data' and
the other one was 'Add a table'. Two names for adding a spreadsheet. Anyway, accounts is already
there, so I'll stop fighting it and deal with the business / personal / merchant bit."

## Making the account kinds into sorts

```
timeout 120 node app-b/study.mjs --try $S/14.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv"
```

14.png: "Edit: accounts". Makes: account (3,000) --transfers (9,113)--> account (3,000). There's a
"Type: account" box on the right.

"Type. That's the obvious place. I want type to come from the kind column."

```
timeout 120 node app-b/study.mjs --try $S/15.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "Type"
timeout 120 node app-b/study.mjs --try $S/16.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "account"
```

15.png: nothing. 16.png: dropdown -- "Existing types: none yet", "New type: account", "Rename
type...". "No 'type from a column'. Just rename. Not here then. Maybe on the kind column itself --
it says 'Attribute' under it, that's probably a dropdown like the From/To ones."

```
timeout 120 node app-b/study.mjs --try $S/17.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "Attribute"
```

17.png: Key, Links to ->, Subtype, Name, Time (greyed, with why), Weight (greyed), Position
(greyed), Attribute (ticked).

"Subtype. That sounds like it. I like that the greyed ones say why -- 'needs a Number'. Gephi
would just not let you."

```
timeout 120 node app-b/study.mjs --try $S/18.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "Attribute" --click "Subtype"
```

18.png: Makes line now reads "account (3,000; kind: merchant | business | personal)". Type line:
"subtypes from kind: merchant (60), business (330), personal (2,610)". Match report: "kind makes 3
subtypes of account ... Every node stays type account, keyed by id, so links and notes still
point at account."

Alex: "60 plus 330 plus 2,610 -- 3,000. Adds up. Those are the counts I'd check against the bank
list. 'Every node stays type account' -- fine, I think that's what I want: they're all accounts,
just different kinds. Apply."

```
timeout 120 node app-b/study.mjs --try $S/19.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "Attribute" --click "Subtype" --click "Apply"
```

19.png: back to the Data panel. 3,000 nodes, 9,113 edges. The filter is gone now ("No filters").
The accounts source line still says "account . 3,000 nodes", no sign of the three kinds. kind is
still "Color (kind)", canvas is still grey with "Nothing is colored or sized by a row".

"Did that do anything? The source says 'account, 3,000 nodes' same as before. And the amount
filter vanished -- did my Apply remove it? Let me reopen."

```
timeout 120 node app-b/study.mjs --try $S/20.png task:t18-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "Attribute" --click "Subtype" --click "Apply" --click "accounts-2026-03.csv"
```

20.png: kind still says Subtype, counts 60 / 330 / 2,610. But the Apply button is lit up blue
again, as if there's something unapplied.

"OK, it stuck. Why is Apply blue again if nothing changed? That would make me click it twice
just in case. I'm calling it done."

## Wrap-up

**Did I succeed?** Mostly, I think. The graph ends up with 3,000 accounts carrying kind and
country, 9,113 transfers, and the kinds split into three sorts with counts that add up. But I never
actually got my account list in myself -- File just said "opens the file picker" and nothing
arrived, Paste threw me into a Les Miserables project, From a URL showed me an alerts table I
didn't ask for. The accounts file was just there after I loaded the transfers. If that's how it
works -- it picks up the matching file -- it needs to say so, because I'd assume it was leftover
from someone else's session.

**Single Ease Question: 3 / 7.** The subtype part was easy and well explained, maybe a 6 on its
own. Getting the second spreadsheet in was the hard part and I didn't really manage it.

**Would I use this instead of what I do now?** Not yet. The join itself is better than Gephi's
"append to workspace" dance -- it shows the Makes line, the match counts and the 60 / 330 / 2,610
split, which is exactly what I'd check against SQL. But things changed under me that I didn't do:
a filter at amount 1,000 appeared and then disappeared after Apply, risk and alert columns showed
up in my account list, a whole different project appeared from Paste. In my job, columns I didn't
bring in ending up in a report is how you get the call. I'd still do the join in pandas and bring
one clean file in until I trust what's on screen is only what I put there.

## Problems noted

1. Adding the second spreadsheet through "Add a table > File..." shows only a toast, "Opens the
   file picker", and no table arrives. The accounts file appears only after loading the transfers,
   with nothing saying where it came from.
2. "Add a table > Paste..." replaces the whole project with Les Miserables and pasted XML; the
   transfers vanish with no warning.
3. "Add a table > From a URL..." shows an accounts table and a 14-row "structuring alerts" table
   from a URL I never typed.
4. The account list shows riskScore, flagged, alertRule and alertTime columns that are not in the
   bank's account list as described.
5. After loading, a filter "amount is at least 1,000" is on that I never set; after Apply on
   accounts it is gone ("No filters"), with no message either time.
6. "Color (kind)" in the attributes list contradicts the grey canvas and "Nothing is colored or
   sized by a row".
7. After applying subtypes, the Sources line still reads "account . 3,000 nodes" -- the three
   kinds are not visible outside the table editor.
8. After Apply, reopening the table shows Apply enabled again with nothing changed.
9. Two names for the same job: "Add a table" in the editor and "Add data to this graph" on the
   Sources plus.
10. The Type dropdown, the first place I looked to make sorts, offers only "New type" and "Rename
    type"; the subtype option lives in the kind column's role menu.
