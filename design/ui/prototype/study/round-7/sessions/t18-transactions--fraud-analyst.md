# Session: bring in transfers plus the account list (fraud analyst)

Participant: Sarah, financial crime investigator (simulated). Mode: own initiative, about five minutes of patience.
Task as read by the moderator: "The transfers came as one spreadsheet that only has account numbers. The bank's account list, which says for each account whether it belongs to a business, a person or a merchant, and which country it is in, is a second spreadsheet. Bring both in so each account carries its details, and treat business, personal and merchant accounts as different sorts of account."

All commands were run from design/ui/prototype. D = tmp/round-7-sessions/t18-transactions--fraud-analyst

## Start screen (shots/tasks/t18-transactions/01.png)

"OK, so the transfers file is already in. from_account, to_account, amount, timestamp. It says 3,000 ids become 'nodes of type node'. Type node. Fine, that tells me nothing. I need the account list in, so I'm looking for an add button. There's a plus next to 'Tables'. No label on it."

## Step 1 -- what is the plus?

    timeout 120 node app-b/study.mjs --try $PWD/$D/01.png task:t18-transactions --hover "Add a table"

"'Add a table'. Good, that's what I want."

## Step 2 -- click it

    timeout 120 node app-b/study.mjs --try $D/02.png task:t18-transactions --click "Add a table"

"File, From a URL, Paste. My account list is a spreadsheet on my drive, so File."

## Step 3 -- File...

    timeout 120 node app-b/study.mjs --try $D/03.png task:t18-transactions --click "Add a table" --click "File..."

"A little black box says 'Opens the file picker' and nothing happens. No picker. In real life I'd pick accounts.csv here. So that's a dead end in this demo. Let me try the others."

## Step 4 -- Paste...

    timeout 120 node app-b/study.mjs --try $D/04.png task:t18-transactions --click "Add a table" --click "Paste..."

"Whoa. Now the title says 'Les Miserables', my transfers table is gone from the list, there's some XML about Napoleon and a warning that Load is off. I did not paste anything. Where are my transfers? If this happened on a real case I'd be hitting Ctrl+Z and swearing. Not touching that again."

## Step 5 -- From a URL...

    timeout 120 node app-b/study.mjs --try $D/05.png task:t18-transactions --click "Add a table" --click "From a URL..."

"Huh. Now there are three tables: accounts (3,000), transfers (9,113) and 'structuring alerts' (14) fetched from alerts.bank.example. I never typed an address. And the accounts table is just there -- I didn't add it. I'll take it, because it's the list I wanted, but I don't know how it got there. The structuring alerts are actually useful to me -- 14 accounts hit the 9,000-to-9,999 rule -- but I didn't ask for them either. Also: something just fetched from a URL. Does that mean data went out? It says 'Local only' at the top, so I'll assume not."

## Step 6 -- look at accounts

    timeout 120 node app-b/study.mjs --try $D/06.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts"

"There it is. id, kind (business, personal), country (GB, MX, BR, US, IN), riskScore, flagged, and the alert columns joined on. Match report: 3,000 rows, every key unique. Good -- 3,000 accounts, same as the 3,000 ids in the transfers. Now 'treat business, personal and merchant as different sorts'. There's a Type box saying 'account'. That's probably it."

## Step 7 -- click "Type"

    timeout 120 node app-b/study.mjs --try $D/07.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Type"

"Nothing. The word itself isn't the button."

## Step 8 -- click the Type box, and the kind header

    timeout 120 node app-b/study.mjs --try $D/08.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "account"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "kind"

"The Type box gives 'Existing types: none yet', 'New type: account', 'Rename type...'. That renames the whole table, it doesn't split it by kind. Clicking the kind header does nothing. Under each column there's grey 'Attribute' -- maybe that's a dropdown."

## Step 9 -- the dropdown under kind

    timeout 120 node app-b/study.mjs --try $D/10.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute"

"Key, Links to, Subtype, Name, Time, Weight, Position, Attribute. 'Subtype' -- that's the closest to 'sorts of account'. I'd never have found this if I hadn't been poking at grey text."

## Step 10 -- Subtype

    timeout 120 node app-b/study.mjs --try $D/11.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype"

"Now it reads 'kind makes 3 subtypes of account: merchant (60), business (330), personal (2,610). Every node stays type account.' That's what I wanted, and it gives me counts I can check against a pivot. Good. The top line has gone into code-speak: 'account (3,000; kind: merchant | business | personal) --transfers (9,113)--> account'. I can read it, but I wouldn't paste that in a file."

## Step 11 -- check transfers before loading

    timeout 120 node app-b/study.mjs --try $D/12.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "transfers"

"Transfers now go 'account to account', amount is a Weight ('Higher means Stronger'), timestamp is Time. Stronger? A bigger transfer is a bigger transfer, not a stronger relationship, but fine. Load."

## Step 12 -- Load

    timeout 120 node app-b/study.mjs --try $D/13.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load"

"A grey hex blob. The bar says '812 of 3,000 nodes' because there's a filter 'amount is at least 1,000' switched on -- I didn't put that there. There's also an off filter 'kind is not merchant'. So someone's been here before me, or it came in with the URL. Attributes say kind is used for 'Color (kind)', but a box on the picture says 'Nothing is colored or sized by a row' and everything is grey. Which is it? I can't tell business from personal on this picture, and there's no legend I can paste. The right panel says 'Graph from 2 tables' while the left lists three sources."

## Step 13 -- check the accounts actually carry their details

    timeout 120 node app-b/study.mjs --try $D/14.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load" --click "Table"

"Node table: id, links in, links out, total, kind, country. ACC-633005 business GB, 15 out. So yes, each account carries kind and country. It opened on 'Rows 381 to 420 of 3,000', which is odd -- why not the top? But the data is in. I'm stopping here."

## Wrap-up

Did I succeed? "Mostly. The accounts are in, each one has its kind and country, and kind is set as the subtype with counts. But I got there by accident: File did nothing, Paste threw away my transfers and loaded some French novel, and the account list only appeared because I clicked 'From a URL', which also pulled in an alerts feed I never asked for. Then the graph came up filtered and grey, with a filter I didn't set."

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? "Not yet. In i2 the import wizard is painful but I know what it'll do. Here the end result was right, and the 'kind makes 3 subtypes: merchant 60, business 330, personal 2,610' line is the kind of check I like -- I can tie it back to a pivot. But tables showing up that I didn't add, a filter I didn't set, and Paste wiping out my data -- that's exactly what I can't explain to an examiner. And I still can't see the business accounts on the picture. If the add-a-file step just worked and the picture showed the three kinds with a legend, I'd consider it for the big cases."
