# Session: two spreadsheets into one network -- Nadia (level-1 alert reviewer)

Task as given: "Two spreadsheets are open on the program's import page: a list of accounts and a
log of transfers between them. If you do not work in banking, treat this as example data. Make one
network of accounts tied by their transfers, and check that no transfer refers to an account
missing from the list."

Commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t24-transactions--alert-reviewer/.

## Step 1 -- start screen (shots/tasks/r8-t24-transactions/01.png)

Think-aloud: "OK, the transfers sheet is up. From account, to account, amount, time -- that's
basically our transaction extract. Up top it says 'account (3,000) --transfers (9,113)--> account
(3,000)'. Weird arrow thing, but I get it: accounts on both ends, transfers in the middle.

Down here: 'Match report'. '9,113 of 9,113 from_account found in accounts. 9,113 of 9,113
to_account found in accounts.' So... that's my check? Every transfer has both ends in the account
list. That's literally the second half of the task, already sitting there. I almost scrolled
past it, it's below the table in small gray-ish text. I'd have expected a big red or green line.

'amount totals 14,156,522' -- total of what, all of March? Fine. 'Top node ACC-393859, in 907
transfers' -- I don't care right now but that's the kind of thing I'd look at.

The blue chips, 'From -> account', 'Weight', 'Stronger / Farther / Capacity' -- no idea what
Farther or Capacity mean for money. It's already on Stronger, I'm not touching it."

## Step 2 -- look at the accounts sheet before loading

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24-transactions --click "accounts"

Think-aloud: "Want to see the account list is actually the list. id is the Key, 3,000 rows,
'every key is unique'. Good, no duplicate accounts. And look -- flagged, alertRule, 'Structuring: 3
or more transfers of 9,000 to 9,999 USD out in 30 days'. That's a real scenario name. Nice that it
came along. Nothing for me to change here. There's a Load button bottom right."

## Step 3 -- Load

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t24-transactions --click "accounts" --click "transfers" --click "Load"

Think-aloud: "Loaded. Right side: Nodes 3,000, Edges 9,113 transfers, 'Weak components 1'. So it's
one network, and the counts match both sheets -- nothing dropped. That's what I'd write in the
file: 3,000 accounts, 9,113 transfers, all 9,113 matched both ends.

The picture in the middle is a gray honeycomb blob. I expected dots and lines. I guess it's
too many to draw? I can't tell which hexagon is which account. 'Nothing is colored or sized by
a row' -- OK, not sure what that's telling me. Doesn't matter for this task.

One thing bugs me: after loading, the match report is gone. If QA asks 'how did you know no
transfer was orphaned?' I'd have to go back to the import page or just trust my memory. I'd want
that line saved somewhere I could screenshot -- the counts on the right kind of prove it, but
only if you already know the sheet sizes."

## Done

- Succeeded? Yes, I think so. One network, 3,000 accounts, 9,113 transfers, and the import page
  said every transfer's from and to account was in the account list.
- Single Ease Question: 6 of 7. Basically one button. Lost a point because the "is anything
  missing" answer is small text under the table and disappears after Load, and the blob view
  told me nothing.
- Would I use this instead of what I use now? For this, maybe. Today I'd do a VLOOKUP in Excel
  of from and to against the account list and count the #N/As -- about five minutes. This was
  under a minute and also gave me the network. But I don't pick tools, and I'd need the match
  result as something I can paste into the alert file, which I didn't see.
