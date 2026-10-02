# Session: bring in transfers plus the account list -- Dana Okafor (supply chain risk analyst)

Task as given: "The transfers came as one spreadsheet that only has account numbers. The bank's
account list, which says for each account whether it belongs to a business, a person or a
merchant, and which country it is in, is a second spreadsheet. Bring both in so each account
carries its details, and treat business, personal and merchant accounts as different sorts of
account."

Dana's framing, said out loud at the start: "Fine. Transfers are my PO lines, the account list is
my supplier master. This is the XLOOKUP I do every quarter."

All commands were run from design/ui/prototype. D below is
tmp/round-7-sessions/t18-transactions--supply-chain-analyst (absolute path used in the real runs).

## Steps

**01 -- start screen** (shots/tasks/t18-transactions/01.png)

"OK, it already read my transfers. From_account and to_account are the two ends, it says 3,000
ids, 9,113 rows. Good, that matches what I'd expect. It calls everything 'node'. Whatever. Now
where does my second file go? There's a 'Tables' list on the left with a plus. That's the only
thing that looks like 'add'."

**02 -- hover the plus**

    timeout 120 node app-b/study.mjs --try $D/02.png task:t18-transactions --hover "Add"

"Tooltip says 'Add a table'. Yes, that's it."

**03 -- click it**

    timeout 120 node app-b/study.mjs --try $D/03.png task:t18-transactions --click "Add a table"

"File, From a URL, Paste. I've got a file. File."

**04 -- File...**

    timeout 120 node app-b/study.mjs --try $D/04.png task:t18-transactions --click "Add a table" --click "File..."

"A little black note: 'Opens the file picker'. And... nothing. My table list is still just the
transfers. Did it open a picker? I don't see one. I'd click it again on my laptop and then
probably drag the file onto the window instead. Let me look at the other options."

(Moderator note: the prototype does not simulate the system file dialog, so a participant cannot
complete File... here.)

**05 -- Paste...**

    timeout 120 node app-b/study.mjs --try $D/05.png task:t18-transactions --click "Add a table" --click "Paste..."

"Whoa. Where did my transfers go? The title says 'Les Miserables' and there's some XML in a box,
'GraphML or GEXF', and Load is greyed out. I didn't paste anything. That's frightening -- if this
were real I'd assume it threw away my transfers. Back out of that."

**06 -- From a URL...**

    timeout 120 node app-b/study.mjs --try $D/06.png task:t18-transactions --click "Add a table" --click "From a URL..."

"Now there are three tables: accounts (3,000), transfers (9,113), and 'structuring alerts' (14)
from some alerts.bank.example address. I didn't give it a URL. But 'accounts', 3,000 -- that's
the account list. Same count as the ids in the transfers. Fine, I'll take it. The alerts thing I
didn't ask for."

**07 -- open the accounts table**

    timeout 120 node app-b/study.mjs --try $D/07.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts"

"accounts-2026-03.csv. id is the Key, then kind -- business, personal -- country, risk score,
flagged. Good, that's my master file. It says Type: account for the whole thing. I need three
sorts. Try the Type box."

**08 -- the Type dropdown**

    timeout 120 node app-b/study.mjs --try $D/08.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "account"

"'Existing types: None yet', 'New type: account', 'Rename type'. Nothing about splitting it by a
column. So not here. The column itself has a little 'Attribute' label under each header -- maybe
that's where I tell it what kind is."

**09 -- the role control under 'kind'**

    timeout 120 node app-b/study.mjs --try $D/09.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute"

"Key, Links to, Subtype, Name, Time, Weight, Position, Attribute. 'Subtype' -- I'd guess that's
'different sorts of account'. Not sure, but nothing else fits."

**10 -- Subtype**

    timeout 120 node app-b/study.mjs --try $D/10.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype"

"There we go. It now says 'subtypes from kind: merchant (60), business (330), personal (2,610)'.
That's the confirmation I wanted -- actual counts. And the bottom line says every node stays an
account so links still point at it. Fine. I do like the counts, that's my pivot table for free."

**11 -- check the transfers table**

    timeout 120 node app-b/study.mjs --try $D/11.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "transfers"

"Transfers now say 'From -> account' and 'To -> account'. So it joined them. What it doesn't
tell me is the thing I actually check in Excel: how many account numbers in the transfers are
NOT on the account list. 'Every row has both ends' isn't the same question. Also, amount has
become 'Weight' and timestamp 'Time' -- on the first screen they were plain attributes. I didn't
do that. Higher means 'Stronger', 'Farther', 'Capacity'? No idea what that means for money."

**12 -- try to drop the alerts table**

    timeout 120 node app-b/study.mjs --try $D/12.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "structuring alerts" --hover "Remove"

"Nothing called Remove. There's a little minus on the row but I don't know what it's called. It
only adds two columns to 14 accounts. I'll leave it; it's not hurting anything, I think."

**13 -- Load**

    timeout 120 node app-b/study.mjs --try $D/13.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load"

"Loaded. Sources: accounts, transfers, the alerts URL. But hold on -- the top says '812 of 3,000
nodes' and there's a filter 'amount is at least 1,000' switched ON, and another one 'kind is not
merchant' switched off. I never made those. So I'm only looking at 812 accounts and I didn't ask
for that. This is exactly the thing that makes me stop trusting a tool: it decided something
without telling me. And the picture is a grey blob of hexagons; it says kind is used for Color
but nothing's colored, and a note says 'Nothing is colored or sized by a row'. So which is it?"

**14 -- open the table to check the accounts carry their details**

    timeout 120 node app-b/study.mjs --try $D/14.png task:t18-transactions --click "Add a table" --click "From a URL..." --click "accounts" --click "Attribute" --click "Subtype" --click "Load" --click "Table"

"OK, this I can read. Each account: id, links in, links out, kind, country. ACC-633005 business
GB. So yes, the details came across. Odd that it opens on 'rows 381 to 420' and not the top, but
fine. I'm stopping here -- the job was to get both files in and the kinds split, and the table
says it's done."

## Wrap-up

**Did I succeed?** "I think so. The accounts show their kind and country, and it split them into
merchant, business and personal with counts. But I got there by a door I didn't understand --
I never actually picked my file; 'File...' did nothing I could see and the URL option somehow
produced my account list plus an alerts feed I didn't ask for. And after Load I'm looking at a
filtered 812 instead of 3,000 because of a filter someone else set. If I were presenting this I'd
want to switch that off first, and I'd want to be sure nothing else was pre-set."

**Single Ease Question (1 = very difficult, 7 = very easy): 4.**
"The splitting-by-kind bit was easy once I found 'Subtype' under the column. Getting the second
file in was not, and 'Paste' throwing me into Les Miserables would have ended a real session."

**Would I use this instead of what I use now?** "No, not instead. In Excel this is one XLOOKUP and
a pivot, and I trust it because I did it. What this does better is the counts per kind right on
the import screen, and having the two files stay linked so I don't redo the lookup next quarter --
if it remembers them. But it pre-set a filter and changed amount into a 'weight' without asking,
and it never told me how many transfer accounts were missing from the master list, which is the
first thing I check. And the usual questions: where does the account list go when I load it
('Local only' up top is a good sign, if it means what I think), will IT sign off, and can I get
the joined table out to Power BI. Side tool at best until those are answered."
