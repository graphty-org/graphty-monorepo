# Session: pick out the flagged accounts based in Great Britain and keep them as a named list

Participant: Sarah, fraud detection analyst (level-2 investigator). Patience mode: first
impression, not mandated -- about five minutes of her own initiative.

Task as given by the moderator: "Pick out every account the monitoring system marked as
suspicious that is based in Great Britain, all at once, and keep them as a named list you can
come back to. The data on screen is a sample: one month of card and bank transfers between
accounts."

Start screen: shots/tasks/t10-transactions/01.png. All renders are in
tmp/round-7-sessions/t10-transactions--fraud-analyst/. Every command was run from
design/ui/prototype; each replays from the start screen.

## Think-aloud

**Start (01.png from shots).** "A gray blob of three thousand hexagons. Fine, I don't care
about the picture yet. Top left: 'Local only' -- good, that's the first thing I'd ask. There is
a search box, 'Find rows and notes'. I'd paste something there, but I don't have an account
number, I have a rule: flagged and GB. That's a filter, which in my world is the table. There's
a 'Table' at the bottom. Open that."

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10-transactions--fraud-analyst/01.png task:t10-transactions --click "Table"
```

**01.png.** "OK, rows. ACC numbers, links in, links out, kind, country. GB is right there in the
first row. Ten columns of twelve. Where's the alert flag? Excel instinct: click the country
header."

```
timeout 120 node app-b/study.mjs --try .../02.png task:t10-transactions --click "Table" --click "country"
```

**02.png.** "It sorted country ascending, BR, DE. There's a little arrow next to the header,
that's probably the filter dropdown. But first I want to see if there's a flag column at all.
'Columns: 10 of 12'."

```
timeout 120 node app-b/study.mjs --try .../03.png task:t10-transactions --click "Table" --click "Columns: 10 of 12"
```

**03.png.** "alertRule, alertTime, country, flagged, riskScore. 'flagged' is ticked, so it's in
the table, just off to the right. Good, the data is there. Now I need it filtered."

```
timeout 120 node app-b/study.mjs --try .../04.png task:t10-transactions --click "Table" --click "Full graph"
```

**04.png.** "There's a funnel up top that says 'Full graph'. Funnel means filter. I clicked it
and... it now says '812 of 3,000 nodes' and on the left there's a filter 'amount is at least
1,000' that's switched ON. I didn't make that. Who put it there? Now I'm looking at a subset I
didn't ask for, and if I hadn't spotted it my list would be wrong. That's exactly the kind of
thing a reviewer catches and I look sloppy. Leave it, go back to the table."

```
timeout 120 node app-b/study.mjs --try .../05.png task:t10-transactions --click "Table" --click "Data" --click "flagged"
```

**05.png.** "Opened 'Data' and clicked 'flagged' in the attributes list. The right panel shows
'amount', an edge attribute with a histogram of transfer amounts. I clicked flagged. It shows
me amount. And the 812 filter is on again. Whatever."

```
timeout 120 node app-b/study.mjs --try .../06.png task:t10-transactions --click "Selection"
```

**06.png.** "There's a 'Selection' row on the left. Clicking it gives me color FFD700, size
1.45, opacity 40 percent, 'Paints 0 nodes'. That's how the selection looks, not how I make one.
Not helpful."

```
timeout 120 node app-b/study.mjs --try .../07.png task:t10-transactions --hover "Find rows and notes"
timeout 120 node app-b/study.mjs --try .../08.png task:t10-transactions --click "Find rows and notes"
```

**08.png.** "The search box takes focus. I'd type 'flagged GB' and see what happens, but in
this session I can't type anything, so I'll assume it finds rows one by one like a Ctrl+F,
which doesn't give me 'all of them at once'."

(Moderator note: the click-through tool has no typing; the participant could not test the
search box with text.)

```
timeout 120 node app-b/study.mjs --try .../09.png task:t10-transactions --click "Table" --click "flagged"
timeout 120 node app-b/study.mjs --try .../10.png task:t10-transactions --click "Table" --click "flagged" --click "flagged"
```

**09.png / 10.png.** "Clicking the 'flagged' header brings the column into view and sorts it.
First click: arrow up, every row 'no'. Second click: arrow down -- and every row is STILL 'no',
same accounts in the same order. Either nothing is flagged in this sample or the sort didn't
do anything. I can't tell which. In Excel I'd see the 'yes' rows jump to the top."

```
timeout 120 node app-b/study.mjs --try .../11.png task:t10-transactions --click "Table" --click "flagged" --click "Column menu"
timeout 120 node app-b/study.mjs --try .../12.png task:t10-transactions --click "Table" --click "The flagged column menu"
timeout 120 node app-b/study.mjs --try .../13.png task:t10-transactions --click "Table" --click "flagged" --click "The flagged column menu"
timeout 120 node app-b/study.mjs --try .../14.png task:t10-transactions --click "Table" --click "flagged" --click "flagged column"
timeout 120 node app-b/study.mjs --try .../15.png task:t10-transactions --click "Table" --click "flagged" --click "Column menu" --click "Column menu"
```

**11.png - 15.png.** "There's a little chevron on the headers. I hit the one on 'id' -- tooltip
says 'The id column menu', and the tooltip pops up in the middle of the chart, nowhere near the
column. Clicking it twice: no menu opens. I can't get the one on 'flagged' at all
('nothing on screen is called' that). So no AutoFilter dropdown. That's the one thing I
expected a table to have."

```
timeout 120 node app-b/study.mjs --try .../16.png task:t10-transactions --click "Views"
```

**16.png.** "'Views' -- 'No saved views. Save view'. That might be the 'named thing I can come
back to', but there's nothing to save yet; I haven't picked anyone."

```
timeout 120 node app-b/study.mjs --try .../17.png task:t10-transactions --click "Analyze"
```

**17.png.** "'Analyze'. Louvain, PageRank, shortest path, links count, total amount. That's
the data scientist's menu. Not clicking Louvain. The box says 'Search, or say what to find',
which is tempting, but again I can't type here. Nothing in the visible list says 'find
accounts where'."

```
timeout 120 node app-b/study.mjs --try .../18.png task:t10-transactions --click "Select"
timeout 120 node app-b/study.mjs --try .../19.png task:t10-transactions --click "Selection" --click "Data"
```

**18.png / 19.png.** "Looked for anything called 'Select' -- just lands on the Selection style
row again. Tried its Data tab and it took me to the Data side panel instead, with the 1,000
amount filter on again."

```
timeout 120 node app-b/study.mjs --try .../20.png task:t10-transactions --click "Data" --click "Add filter"
timeout 120 node app-b/study.mjs --try .../21.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value"
timeout 120 node app-b/study.mjs --try .../22.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value" --click "flagged"
```

**20.png - 22.png.** "Fine, filters then. 'Add filter' gives 'New step' and a 'Keep: pick one'
menu: 'By an attribute or computed value'. Then 'Pick a field', a list with flagged and country
in it. That's the closest I've got. I pick 'flagged'... and the list closes, the right panel
shows 'amount' again and the new step still says 'Kept all 812 nodes'. It didn't take. And even
if it had worked: this is a filter stacked on top of somebody else's amount filter, and it
hides the rest of the graph. I was asked to pick them out and keep them as a list, not to hide
everyone else. Is a filter a list? I don't think so. I'd have no idea where 'the list' lives."

```
timeout 120 node app-b/study.mjs --try .../23.png task:t10-transactions --click "More"
```

**23.png.** "A menu: 'Select all visible', 'Invert selection', 'Reselect previous'. So I could
filter down to the GB flagged ones and then 'select all visible'. Maybe that's the trick. But
I'd have to know to do it in that order, and I still don't see where I'd name the result."

```
timeout 120 node app-b/study.mjs --try .../24.png task:t10-transactions --click "Assistant"
```

**24.png.** "'Assistant: Off. Nothing is sent.' Good, keep it off. I'm not turning on anything
that might send account data somewhere."

```
timeout 120 node app-b/study.mjs --try .../25.png task:t10-transactions --click "Table" --click "GB"
```

**25.png.** "Clicked a GB cell: 'Selects ACC-633005'. One account. I'm not ticking three
thousand rows one at a time."

```
timeout 120 node app-b/study.mjs --try .../26.png task:t10-transactions --click "Actions"
```

**26.png.** "The lightning bolt is a command box, 'Type a command or a place'. Re-run layout,
PageRank, Data: Attributes, Data: Filters, Views, 'Go to view: Whole cast'. Nothing like
'select where'. I'd have to type and guess the word."

```
timeout 120 node app-b/study.mjs --try .../27.png task:t10-transactions --click "Data" --click "country"
```

**27.png.** "Last try: click 'country' in the attributes. Right panel shows... 'amount' again.
Every attribute I click shows amount. I'm done. That's well past my five minutes."

## Outcome

Gave up. I never had the GB flagged accounts picked out, never saw a count of them, and never
found where a named list would live.

- Did I succeed? No.
- Single Ease Question: 2 out of 7. The data was clearly there (flagged, country) and the
  closest path -- a filter by attribute -- was findable, which is why it isn't a 1.
- Would I use this instead of my current tool? No. "I export accounts to Excel, AutoFilter
  flagged = yes and country = GB, copy the IDs into a tab named for the case. Two minutes.
  Here I spent twenty and got nothing. And a filter I didn't create was switched on behind my
  back, which on a real case means a wrong number in the SAR."

## What got in the way, in her words

1. "The table looks like a spreadsheet but doesn't behave like one. No filter dropdown on the
   header; the little arrow opens nothing."
2. "Sorting 'flagged' the other way changed the arrow and nothing else. I can't tell if
   anything is flagged at all."
3. "A filter on amount turned itself on when I opened the Data panel or clicked the funnel.
   I never made it. The top bar went to '812 of 3,000' without me asking."
4. "Clicking flagged, or country, in the attribute list shows me 'amount'. Every time."
5. "Picking 'flagged' as the filter field didn't stick."
6. "'Selection' is a paint swatch, not a way to select. Where do I select by a rule?"
7. "Nothing tells me where a saved list of accounts would go. 'Views'? 'Filters'? A list of
   IDs is a basic thing; I'd expect it to be called a list."
8. "The column-menu tooltip shows up in the middle of the chart, not by the column."

## What was fine

- "Local only" in the top bar and "Off. Nothing is sent." on the assistant. Those two I would
  quote to IT.
- The column chooser listed the fields plainly: flagged, country, riskScore, alertRule. I knew
  the data was there in ten seconds.
- "Select all visible" exists in the menu; with a working filter that might have been the
  route.
