# Session: two spreadsheets into one network of accounts -- the reporter with a contacts sheet (Ruth)

Task as given: "Two spreadsheets are open on the program's import page: a list of accounts and a
log of transfers between them. If you do not work in banking, treat this as example data. Make one
network of accounts tied by their transfers, and check that no transfer refers to an account
missing from the list."

Start screen: shots/tasks/r8-t24-transactions/01.png. Renders saved in
tmp/round-8-sessions/r8-t24-transactions--data-journalist/.

## Step 0 -- the start screen (no command)

Ruth: "OK, it's already on the import page with the transfers sheet showing. Top line says 'Makes
account (3,000) --transfers (9,113)--> account (3,000)'. That reads like a sentence, sort of: accounts
linked by transfers. Fine.

Down at the bottom there's a 'Match report'. This is the bit I care about. '9,113 of 9,113
from_account found in accounts. 9,113 of 9,113 to_account found in accounts.' So every sender and
every receiver is on the account list. That's literally my second question, answered before I
asked it. Good -- but I want to see the account list before I believe the count. Also 'amount
totals 14,156,522' -- I could check that against the sheet's own SUM. I like that.

The little blue chips under the column names, 'From -> account', 'To -> account', 'Weight', 'Time'
-- I guess the program decided what each column is. 'Weight', 'Higher means Stronger / Farther /
Capacity' -- no idea what Farther or Capacity mean here and I'm not touching it. 'One edge per Row /
Pair' -- edge, I assume, is a line. It says pairs would change nothing anyway."

## Step 1 -- look at the account list

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24-transactions--data-journalist/01.png task:r8-t24-transactions --click "accounts"

Ruth: "There's the account list: id, kind, country, riskScore, flagged, alertRule, alertTime. The id
column is marked 'Key' -- that's what the transfers are matched against, I'd guess. Report says
'3,000 rows; every key is unique.' Good, no duplicate accounts. It says 'an edge' is greyed out
because 'this table has none' linking columns, which is fine, it's a list of things, not links.

So: 3,000 accounts, all unique, and every transfer's two ends are on the list. Nothing is missing.
Now I just need to actually make the thing. Big blue 'Load'."

## Step 2 -- load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24-transactions--data-journalist/02.png task:r8-t24-transactions --click "accounts" --click "Load"

Ruth: "It loaded. Right-hand panel: Nodes 3,000, Edges '9,113 transfers, each a distinct pair'.
Those are the same numbers the sheets had, so nothing was dropped on the way in. 'Weak components
1' -- I had to think about it, but I take that to mean it's all one connected network, which is
what I was asked to make. Density, Reciprocity, degree distribution log-log -- that's for someone
else; I'd skip it.

The picture in the middle is odd. It's a blob of grey hexagons, not dots and lines. I expected to
see accounts and arrows. Maybe that's what 3,000 dots look like when it's zoomed out? There's a
pill saying 'Nothing is colored or sized by a row' which I don't understand at all -- by a row of
what? I'd ignore it, but a graphics desk person would ask me what the hexagons are and I couldn't
answer.

Also the title says 'Transfers, March 2026' and the graph says 'Transfers'. Fine."

## Step 3 -- go back and make sure the check is still there

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24-transactions--data-journalist/03.png task:r8-t24-transactions --click "accounts" --click "Load" --click "from 2 tables"

Ruth: "'from 2 tables' is a link, so I clicked it to see if I can get back to where the numbers
came from. It reopens the transfers sheet, now headed 'Edit: transfers', with the same match report:
9,113 of 9,113 found on both sides, 9,113 rows became 9,113 edges. 'Apply is off: Nothing has
changed yet.' So the check stays with the graph -- I can show an editor where the count came from
later. That's the thing I'd want for a fact-check. I'm done; I'll leave it."

## After the task

**Did I succeed?** Yes, I think so. One network: 3,000 accounts, 9,113 transfers, one component.
The check: every transfer's sender and receiver was found in the account list (9,113 of 9,113 each
way), and the account ids are all unique.

What I could not check: what the screen would have said if a transfer DID point at a missing
account. Everything matched, so I only saw the happy case. I'd trust it more if the report said
what it does with a mismatch (drop the row? add a mystery account?) even when the count is zero.

**Single Ease Question:** 6 out of 7. The answer was on the very first screen; I only lose a point
because the picture after loading was a hexagon blob I could not explain, and some labels
('Weight', 'Stronger / Farther / Capacity', 'Nothing is colored or sized by a row', 'Weak
components') assume I know graph words.

**Would I use this instead of what I use now?** For the join check, yes. Today I'd do a VLOOKUP or
COUNTIF in the spreadsheet to find transfers with no matching account, and I'd probably get it
subtly wrong. Here the count is written out in a sentence I can quote. 'Local only' and 'The data
stays on this computer: nothing is uploaded' matter to me too. For the picture, not yet -- I'd need
to know what the hexagons mean before I put it in front of an editor.

## Observations for the designers (Ruth's words, not graded)

- The match report answered the check before I asked; it's the best thing on the screen.
- It shows only the passing case. Tell me what happens to a transfer whose account is missing.
- The loaded picture is grey hexagons, not accounts and lines; nothing on screen says what a
  hexagon is.
- "Nothing is colored or sized by a row" reads like an error and means nothing to me.
- "Weak components 1" is the line that tells me it is one network, but the word is jargon.
- "from 2 tables" taking me back to the report is good: the check stays with the graph.
