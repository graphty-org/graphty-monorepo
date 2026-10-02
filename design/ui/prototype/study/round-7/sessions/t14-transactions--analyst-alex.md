# Session: bring in transfers and the account list -- Analyst Alex

Task as given: "You were sent this month's transfers as one spreadsheet, and the bank's account
list as a second spreadsheet. Bring both in so each transfer links the paying account to the
receiving account, with the account details attached, and check it before you go on."

All commands run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t14-transactions--analyst-alex/`.

## Start screen (shots/tasks/t14-transactions/01.png)

> OK, so the transfers file is already open in some kind of import screen. from_account and
> to_account are marked "From -> node" and "To -> node", amount is a number, timestamp has a little
> calendar. Bottom says 9,113 rows became 9,113 edges, 3,000 ids found. Good, that's the kind of
> count I'd check against SQL. "Local only" up top -- I'm going to take that as "doesn't upload",
> I'd want to hover it later.
>
> But the nodes are just called "node" and there's nothing about the account list. I need the
> second file. There's a plus next to "Tables". Let's see what it is.

## 01 -- hover the plus

    timeout 120 node app-b/study.mjs --try .../01.png task:t14-transactions --hover "Add"

> "Add a table". Fine, that's what I want.

## 02 -- click it

    timeout 120 node app-b/study.mjs --try .../02.png task:t14-transactions --click "Add a table"

> File, From a URL, Paste. My account list is a CSV on my laptop, so File.

## 03 -- File...

    timeout 120 node app-b/study.mjs --try .../03.png task:t14-transactions --click "Add a table" --click "File..."

> "Opens the file picker" toast. And... nothing else. Same screen, one table. I'd have picked
> accounts.csv in the picker, I assume. Nothing came back. Is it still reading? There's no
> second row in Tables. Hmm.

## 04 -- try Paste instead

    timeout 120 node app-b/study.mjs --try .../04.png task:t14-transactions --click "Add a table" --click "Paste..."

> Wait -- what? The title says "Les Miserables" now and my transfers table is gone. There's some
> XML I didn't paste, and it's asking me GraphML or GEXF. I clicked "paste" to ADD a table and it
> threw away the one I had. That's exactly the kind of thing that ends up wrong in a report. I'm
> backing out of that.

## 05, 06 -- maybe the link is set on the column

    timeout 120 node app-b/study.mjs --try .../05.png task:t14-transactions --click "From -> node"
    timeout 120 node app-b/study.mjs --try .../06.png task:t14-transactions --click "From -> node" --hover "From ->"

> The dropdown on from_account: From ->, To ->, Subtype, Name, Time (grayed, "reads as Category"
> -- that's odd, it's a timestamp column? no, this is from_account, fine), Weight, Edge id,
> Attribute. "From ->" opens "node" or "New type...". So I could call the type "account", but
> there's no way to point it at a second file from here. The account list has to come in as its
> own table first.

## 07 -- From a URL, just to see

    timeout 120 node app-b/study.mjs --try .../07.png task:t14-transactions --click "Add a table" --click "From a URL..."

> I didn't type a URL and it's showing me "Add to Transfers" with three tables: accounts 3,000,
> transfers 9,113, and "structuring alerts" 14 from some bank alerts address. Top line says
> "account (3,000) --transfers (9,113)--> account (3,000)". So that's what the end state is
> supposed to look like, I guess? But I didn't do any of that. I don't trust a screen that
> skipped my steps. Leaving it.

## 08, 09 -- hover the file name, try New type

    timeout 120 node app-b/study.mjs --try .../08.png task:t14-transactions --hover "transfers-2026-03.csv"
    timeout 120 node app-b/study.mjs --try .../09.png task:t14-transactions --click "From -> node" --hover "From ->" --click "New type..."

> No tooltip on the file name. New type gives a little "Name: from_account" box. I'd rename it to
> account, but that still doesn't bring in the second file. Closing that.

## 10 -- just Load what I have, see if I can add after

    timeout 120 node app-b/study.mjs --try .../10.png task:t14-transactions --click "Load"

> "Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges", progress bar, Cancel. Good, I like
> that it has a cancel.

## 11 -- go to Data

    timeout 120 node app-b/study.mjs --try .../11.png task:t14-transactions --click "Load" --click "Data"

> OK, now Sources shows accounts-2026-03.csv (account, 3,000 nodes) AND transfers-2026-03.csv.
> So the accounts file did come in -- I'm guessing from the File picker earlier? I genuinely don't
> know when that happened. Right panel: Graph "from 2 tables", 3,000 nodes, 9,113 edges, directed,
> weight "amount, stronger", one weak component. Those match what I'd expect.
>
> BUT: there's a filter on, "amount is at least 1,000", 812 of 3,000 nodes. I never made that
> filter. The header says "812 of 3,000 nodes" so at least it isn't hiding it, but if I'd gone
> straight to the picture I'd have been looking at a quarter of the accounts. And the canvas is a
> gray hexagon blob. Hairball, as usual.

## 12 -- open the accounts source to check it

    timeout 120 node app-b/study.mjs --try .../12.png task:t14-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv"

> "Makes account (3,000) --transfers (9,113)--> account (3,000)". That's the sentence I want.
> id is the Key, then kind, country, riskScore, flagged, alertRule, alertTime -- those are the
> account details. Match report: "3,000 rows; every key is unique." Good, no duplicate ids.

## 13 -- and the transfers side

    timeout 120 node app-b/study.mjs --try .../13.png task:t14-transactions --click "Load" --click "Data" --click "accounts-2026-03.csv" --click "transfers"

> from_account is "From -> account", to_account "To -> account". amount became Weight (stronger),
> timestamp became Time -- someone decided that for me, which is fine, it's what I'd pick.
> Match report: 9,113 rows, both ends, 9,113 edges.
>
> What it does NOT say is the thing I actually care about: did every from/to id find a row in the
> account list? I can sort of infer it -- 3,000 ids in the transfers, 3,000 accounts -- but I'd
> want a line like "9,113 of 9,113 transfers matched an account on both ends, 0 unmatched". In SQL
> that's the anti-join I'd run first. I'd still run that in pandas before I trusted it.

## Wrap-up

**Did I succeed?** Sort of. The screen says the graph is account-to-account from two tables with
the account details attached, and the counts look right. But I didn't knowingly bring the account
list in -- the File picker did nothing I could see, Paste threw away my transfers, and URL jumped
to a finished screen I didn't build. Then after Load the accounts were just there, plus a filter
I didn't ask for. I'd call it "it's in, I think", not "I did it".

**Single Ease Question:** 3 of 7. The import screen itself is clear and the counts are right
there, which I like. Getting the second file in was the hard part, and the check stopped one line
short of what I need.

**Would I use this instead of my current tool?** Not yet. The "Makes account --transfers-->
account" line and the counts on the import screen are better than Gephi's import wizard, and
"Local only" is the right idea. But Paste wiping my table, a filter appearing on its own, and no
"unmatched ids" line mean I'd still do the joining and checking in pandas and only bring the
finished file here.
