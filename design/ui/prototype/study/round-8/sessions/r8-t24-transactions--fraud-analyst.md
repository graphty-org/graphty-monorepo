# Session: transfers import -- Sarah, fraud analyst

Task as given: "Two spreadsheets are open on the program's import page: a list of accounts and a
log of transfers between them. If you do not work in banking, treat this as example data. Make
one network of accounts tied by their transfers, and check that no transfer refers to an account
missing from the list."

Mode: first impression (not mandated). Start screen: shots/tasks/r8-t24-transactions/01.png.
Renders: tmp/round-8-sessions/r8-t24-transactions--fraud-analyst/.

## Step 0 -- the start screen (no command; read 01.png from shots/tasks)

Transfers sheet is up. From, to, amount, timestamp. Top line says "account (3,000) --transfers
(9,113)--> account (3,000)". OK, that's the network I want, so somebody already guessed the
mapping. Fine.

The thing I actually care about is at the bottom: "9,113 of 9,113 from_account found in
accounts." "9,113 of 9,113 to_account found in accounts." That's my check. No orphans either
way. In Excel that's two VLOOKUPs and a COUNTIF on #N/A, so this saves me ten minutes and, more
to the point, it says it in a sentence I could paste into a QA note.

Also good: "The data stays on this computer: nothing is uploaded." and "Local only" up top.
That's the first question I'd have asked.

Things I skimmed or did not get:
- "Weight", "Higher means Stronger / Farther / Capacity" under amount. I don't know what that
  is. A bigger transfer is... stronger? Left it alone.
- "Each row is a node / an edge", "One edge per Row / Pair". Developer words. I left them as
  they were because the top line already said accounts and transfers.
- "Top node: ACC-393859, in 907 transfers." Useful -- that's my hub, I'd look at that account
  first. "Node" I translate to "account".
- "amount totals 14,156,522" -- I can tie that back to my statement total. Good. No currency
  shown though.

Before I trust it I want to see the accounts sheet wasn't mangled.

## Step 1 -- look at the accounts sheet

```
timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t24-transactions--fraud-analyst/01.png task:r8-t24-transactions --click "accounts"
```

Accounts sheet: id marked "Key", kind, country, riskScore, flagged, alertRule, alertTime. The
structuring alerts are in there -- "3 or more transfers of 9,000 to 9,999 USD out in 30 days".
Good, those come along with the accounts. Report says "3,000 rows; every key is unique." So no
duplicate account IDs. That's the other half of the check I'd have done by hand.

## Step 2 -- load it

```
timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t24-transactions--fraud-analyst/02.png task:r8-t24-transactions --click "Load"
```

Network is up. Right side: 3,000 nodes, 9,113 transfers, each a distinct pair. Directed. Same
numbers as the import page, so nothing got dropped on the way in. "Weak components 1" -- I think
that means everything is connected to everything somehow; I'd call that one cluster.

The picture itself is a gray blob of hexagons. Great, a hairball. I can't see a single account
or a single transfer in it. I wasn't asked to investigate anything, so I'm stopping here, but
the first thing I'd do next is type ACC-393859 in "Find rows and notes" and see who it pays.

"Nothing is colored or sized by a row" -- no idea what that's telling me. Skipped it.

## Verdict

- Succeeded? Yes. One network of accounts and transfers is loaded (3,000 accounts, 9,113
  transfers), and the import page told me in plain words that every from and to account was
  found in the accounts list, and that every account ID is unique.
- Single Ease Question: 6 of 7. The import was mostly done for me and the orphan check was
  already on screen. Lost a point for the developer words (node, edge, weight, Stronger /
  Farther / Capacity, Row / Pair) sitting right next to the controls I'd need if the guess had
  been wrong -- if it had mapped amount wrong I would not have known which of those to touch.
- Would I use it instead of my current tool? For this step, over Excel VLOOKUPs and over the
  i2 import wizard -- yes, if IT approved it. The "nothing is uploaded" line and the match report
  are exactly what I need for the file. But what I got at the end is a gray blob, not a link
  chart. Ask me again once I've seen whether I can pull one account's counterparties with
  amounts and dates, and get a picture and a CSV out for the case file.

## Problems noted

1. The weight controls under amount ("Higher means Stronger / Farther / Capacity") mean nothing
   to me. I'd leave them alone and hope.
2. "Each row is a node / an edge", "One edge per Row / Pair", "Top node" -- developer vocabulary
   on the import page. Readable only because the top line said account and transfers.
3. After loading, the picture is a gray hexagon blob with no accounts visible. Fine for "it
   loaded", useless as evidence.
4. "Nothing is colored or sized by a row" -- unclear message, skipped.
5. Totals show no currency.

## What worked

- The orphan check is stated outright: "9,113 of 9,113 from_account found in accounts", same
  for to_account, plus "every key is unique" on the accounts sheet.
- "The data stays on this computer: nothing is uploaded" and "Local only" are visible without
  asking.
- Counts after loading (3,000 / 9,113) match the import page, so I can trust nothing was dropped.
- Amount total and date range given up front, which I can tie to my statement export.
