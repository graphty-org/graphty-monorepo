# Session: select every flagged account in Great Britain -- Marcus, criminal intelligence analyst

Task as given: "March's card transfers are open (example data if you do not work in banking).
Pick out, all at once, every account in Great Britain that was flagged, so you can work on just
those. Say how many there are."

Start screen: shots/tasks/r8-t32/01.png. All commands run from design/ui/prototype; renders in
tmp/round-8-sessions/r8-t32--intelligence-analyst/ (D below). Each run replays from the start.

## Think-aloud

**Start.** Big gray blob of hexagons, 3,000 accounts, 9,113 transfers. Not money laundering, but
it's the same as a bank subpoena return for me. I need two columns: country and the flag. In
Excel I'd put a filter on the header row and tick two boxes. Let me find the spreadsheet.

**01 -- clicked "Table".**
`timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t32 --click "Table"`
A grid at the bottom. id, links in, links out, total amount. No country column on screen, no
flagged column. "Columns: 11 of 13" -- so there are more over to the right I can't see.

**02 -- clicked "Columns: 11 of 13".**
`... --click "Table" --click "Columns: 11 of 13"`
OK, country and flagged are both there and ticked. They're just off the right edge. No filter
arrow on the headers that I can see. Moving on -- I see a "Full graph" button with a funnel at the
top. Funnel means filter.

**03 -- clicked "Full graph".**
`... --click "Full graph"`
Flipped me to a Data page. Sources, Filters, Attributes. "No filters. Filters change what is
computed; the eye in the Graph tree only hides." I read that twice. I don't want to change any
math, I want to work on a handful of accounts. But a filter is what I know. Add filter step.

**04 -- clicked "Add filter step".**
`... --click "Full graph" --click "Add filter step"`
Menu: by an attribute, top of a computed value, largest component, k-core. "By an attribute" is
the only one I understand.

**05 -- clicked "By an attribute or computed value".** Attribute list. country is there.

**06 -- clicked "country".**
`... --click "By an attribute or computed value" --click "country"`
Wrong country -- it went to the one in the left list and showed me the attribute's info page
instead. Annoying; there are two things called country on screen.

**07 -- clicked "country, accounts" (the one in the dropdown).**
Now "country is [ ]" with an empty box. "This step: 3,000 of 3,000 nodes."

**08/09 -- typed "GB", then pressed Enter.**
`... --click "country, accounts" --type "GB"` and `... --type "GB" --key Enter`
The step is now called "country is GB". The count still says 3,000 of 3,000 and the picture didn't
change at all. So either nobody in this file is GB, or it's "UK", or "United Kingdom", or it just
didn't apply. There's no list of the values to pick from. In Excel the filter drop-down shows me
every value in the column. This is the first wall. I backed out.

**10 -- typed "GB" in "Find rows and notes".**
`... --click "Find rows and notes" --type "GB"`
"No match for GB." Great. Now I really don't know what the country values look like.

**11 -- clicked "Selection".** Just the yellow highlight color settings. Not a way to select.

**12 -- opened the "More actions" menu (top right).** Select all visible, invert selection,
reselect previous. Nothing like "select by". Is there a way to just... pick by column value?

**13/14 -- pressed Ctrl+K, typed "select".**
`... --key "Control+k"` and `... --key "Control+k" --type "select"`
Ctrl+K popped up a command search -- I only tried it because Chrome and Teams do that. Typed
"select" and there it is: "Select where... Main menu > Select where". Nobody would ever have shown
me that. Should be on the screen somewhere I can see it.

**15 -- clicked "Select where...".**
A Select box with a Query field already holding `kind == 'personal'` and "2,610 of 3,000 nodes
match". So it's a formula box. I don't write queries, but the example shows me the shape.

**16 -- clicked "+ condition".** It stuck "and" on the end of the personal one and opened an
attribute list. I don't want personal. Backed out.

**17 -- cleared the box and typed my own.**
`... --click "kind == 'personal'" --key "Control+a" --type "country == 'GB' and flagged == true"`
"1 of 3,000 nodes match." One? Every flagged account in Great Britain and it's one? Either that
is the answer or GB is the wrong spelling and the one is some fluke.

**18 -- tried `country == 'GB'` alone to check.**
"Not available yet: counting this query in this version." So I can't check how many are GB at
all. I can't sanity-check the number I'm about to give my sergeant.

**19 -- went back to the full query and clicked "Select 1".**
`... --type "country == 'GB' and flagged == true" --click "Select 1"`
Banner: "Selected 1 of 3,000 nodes where country == 'GB' and flagged == true." Side panel says
1 node. Fine. But I can't see which hexagon lit up in that blob. And now the left list suddenly
has "Louvain 35 groups" and "Links in (count)" in it. I did not run anything called Louvain.
Where did that come from? That's the kind of thing I'd have to explain on the stand.

**20 -- opened the Table to see the account.**
`... --click "Select 1" --click "Table"`
Still 3,000 rows, sorted by amount, no row highlighted, no "show selected only". I can't see the
one account I picked, its ID, or its country to confirm GB was the right spelling. Stopping here.

## Result

My answer: **1 account** (country GB and flagged), selected all at once with "Select where".

Do I think I succeeded? Maybe. The tool says 1 is selected and the rule reads right. But I never
saw what the country values look like, the GB-only count "isn't available", the filter attempt
with GB did nothing, and I can't find the one account in the table or the picture. I would not
repeat "one" to a sergeant without checking it in Excel first.

**Single Ease Question: 2 out of 7.**

Would I use this instead of Excel and i2? Not for this. In Excel this is two dropdowns on a
header row and the status bar tells me the count, and I can see the rows. Here the obvious path
(filter) took my "GB" and did nothing, the search box said no match, and the thing that worked was
hidden behind a keyboard shortcut and a formula I had to type. Once I found "Select where" it was
quick, and the banner repeating my rule back is good -- I could put that sentence in a report.
Show me the values in the column, give me the select from the table header, and show me the rows
I picked, and it would be close.

## Problems seen

- Filter value is a free-text box with no list of the column's values; typing GB left the count at
  3,000 of 3,000 with no message.
- "Find rows and notes" found nothing for GB even though country is a column.
- "Select where..." is reachable only through Ctrl+K (or a main menu I never opened); nothing on
  the Graph page or table offers it.
- The Select box arrives with somebody else's query (`kind == 'personal'`) in it; "+ condition"
  appends to it instead of starting mine.
- Counting a single-condition query said "not available yet", so the result could not be checked.
- After selecting, Louvain (35 groups) and Links in (count) appeared in the list unasked.
- The table does not mark or isolate selected rows; country and flagged columns are off screen.
- Two controls named "country" on screen at once; clicking the name went to the wrong one.
