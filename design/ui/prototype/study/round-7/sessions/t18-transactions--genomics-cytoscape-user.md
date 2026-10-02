# Session: bring in transfers plus the account list, with account kinds as sorts

Participant: Maren, cancer-genomics postdoc who uses Cytoscape (played in character).
Task as given: "The transfers came as one spreadsheet that only has account numbers. The bank's account list, which says for each account whether it belongs to a business, a person or a merchant, and which country it is in, is a second spreadsheet. Bring both in so each account carries its details, and treat business, personal and merchant accounts as different sorts of account."
Start screen: shots/tasks/t18-transactions/01.png. Renders: tmp/round-7-sessions/t18-transactions--genomics-cytoscape-user/NN.png.
All commands run from design/ui/prototype; `D` = tmp/round-7-sessions/t18-transactions--genomics-cytoscape-user (absolute path in the real runs).

## Start screen

"OK, so the transfers file is already in the import screen. from_account, to_account, amount, timestamp. It says 3,000 ids became nodes 'of type node' -- fine, that's the account numbers. In Cytoscape this is the edge table import; the next step for me would be 'Import Table from File' with the node table and match on the key column. Here there's a 'Tables' list with a plus on it. That's the obvious thing to try."

## Step 1 -- what is the plus?

    timeout 120 node app-b/study.mjs --try $D/01.png task:t18-transactions --hover "Add a table"

"Tooltip says 'Add a table'. Good, that's what I want."

## Step 2 -- open it

    timeout 120 node app-b/study.mjs --try $D/02.png task:t18-transactions --click "Add a table"

"File, From a URL, Paste. My account list is a file on my disk, so File."

## Step 3 -- File...

    timeout 120 node app-b/study.mjs --try $D/03.png task:t18-transactions --click "Add a table" --click "File..."

"A little box saying 'Opens the file picker' and then... nothing. No dialog, nothing added to the list. In the real thing I suppose I'd pick the CSV here. I can't, so let me see what Paste does."

## Step 4 -- Paste...

    timeout 120 node app-b/study.mjs --try $D/04.png task:t18-transactions --click "Add a table" --click "Paste..."

"Wait. What? The title changed to 'Les Miserables', my transfers table is gone from the list, and there's some XML I never pasted, with a warning that Load is off. That's alarming. I clicked Paste and it threw away my transfers? If that happened to me for real I'd close the tab. I'll back out and try the URL one instead."

## Step 5 -- From a URL...

    timeout 120 node app-b/study.mjs --try $D/05.png task:t18-transactions --click "Add a table" --click "From a URL..."

"Now the header says 'Add to Transfers', and there are three tables: accounts (3,000), transfers (9,113), and 'structuring alerts' (14) from some alerts.bank.example address. I didn't add an alerts feed and I didn't add accounts yet either -- but OK, 'accounts' is presumably my account list. The alerts one says 14 of 14 matched, which is the kind of number I like seeing. I'll look at accounts."

## Step 6 -- the accounts table

    timeout 120 node app-b/study.mjs --try $D/06.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts"

"There it is: id is the Key, kind is business/personal, country, riskScore, flagged. Each row is 'a node', Type 'account'. So the id column is what joins to from_account and to_account. Now 'treat business, personal and merchant as different sorts'. In Cytoscape that's just a column I'd map a shape or color to. The Type dropdown at the top right looks like the place."

## Step 7 -- the Type dropdown

    timeout 120 node app-b/study.mjs --try $D/07.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "account"

"'Existing types: None yet. New type: account. Rename type.' Nothing about using the kind column. So not here. Maybe the little 'Attribute' under the kind column header is a menu, the way 'Key' is under id."

## Step 8 -- the role under 'kind'

    timeout 120 node app-b/study.mjs --try $D/08.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute"

"Key, Links to, Subtype, Name, Time, Weight, Position, Attribute. 'Subtype' -- that's the word for 'different sorts of account'. I'll take it. I like that the grayed ones say why: 'Reads as Category; needs a Number'."

## Step 9 -- Subtype

    timeout 120 node app-b/study.mjs --try $D/09.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype"

"Good. It gives me counts: merchant 60, business 330, personal 2,610. And 'Every node stays type account, keyed by id, so links and notes still point at account.' The top line now reads account (kind: merchant | business | personal) --transfers--> account. That's clear. What I don't see is how many of the transfer account numbers were actually found in the account list. That's exactly the number I always want and never get."

## Step 10 -- check the transfers side

    timeout 120 node app-b/study.mjs --try $D/10.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "transfers"

"From -> account, To -> account, amount became Weight, timestamp became Time -- all on its own. The report says 9,113 rows, every row has both ends. It still doesn't say '3,000 of 3,000 transfer accounts found in accounts-2026-03.csv'. I'd infer it because both are 3,000, but inferring is how I got burned with gene tables. I'll Load."

## Step 11 -- Load

    timeout 120 node app-b/study.mjs --try $D/11.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load"

"A gray hairball. Top bar says '812 of 3,000 nodes', because there's a filter 'amount is at least 1,000' switched on that I never set. And another one, 'kind is not merchant', switched off. The alerts feed is in Sources too, which I didn't add. The Attributes list says kind is in use for 'Color (kind)', but a box on the graph says 'Nothing is colored or sized by a row' and everything is gray. Which is it? And the right panel says 'Graph from 2 tables' while Sources lists three. So the import worked, I think, but the screen is full of things I didn't do."

## Step 12 -- look at the node table

    timeout 120 node app-b/study.mjs --try $D/12.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load" --click "Table"

"OK, this I trust: '3,000 nodes (before the filter) from the node file accounts-2026-03.csv', with kind and country per account and in/out link counts. So each account does carry its details. I'm done."

## Wrap-up

Succeeded? "Mostly yes. Both files are in, the accounts have kind and country, and kind is set as the subtype with counts per sort. But I only got the account list in by a detour -- the File option did nothing I could see, and Paste replaced my whole session with someone else's XML -- and when I loaded there was a filter on and an alerts feed in there that weren't mine. I'd want to know who put those there before I showed anyone this."

Single Ease Question: 4 of 7.

Would I use this instead of my current tool? "For this kind of join, the subtype counts and the 'what it makes' line are better than Cytoscape's import, which just tells me to check my key column. But it still didn't tell me how many transfer accounts matched the account list, which is the one number I care about, and the Paste scare would stop me trusting it with real data. I'd explore in it; my figures stay in Cytoscape, because that's what the lab protocol and my PI expect."
