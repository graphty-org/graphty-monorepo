# Session: pick out the flagged accounts based in Great Britain and keep them as a named list

Participant: Priya, senior threat hunter at a regional bank (persona: study/personas/cybersecurity-analyst.md)

Task as given: "Pick out every account the monitoring system marked as suspicious that is based in
Great Britain, all at once, and keep them as a named list you can come back to. The data on screen
is a sample: one month of card and bank transfers between accounts."

Start screen: shots/tasks/t10-transactions/01.png
Renders: tmp/round-7-sessions/t10-transactions--cybersecurity-analyst/01.png to 21.png
All commands run from design/ui/prototype; D = tmp/round-7-sessions/t10-transactions--cybersecurity-analyst (absolute path in the real runs).

Outcome: gave up. No accounts selected, no named list made.

## Think-aloud

**Start screen.** "Is this approved, where does it run, does it phone home? There's a chip that says
'Local only' up top. Fine, that's one of my three answered, sort of. It says 'Transfers, March 2026',
3,000 nodes, 9,113 edges. Good, I have a time range in the title. It's a gray hairball, which I
don't care about. What I want is a query: flagged = true AND country = GB. Where do I type it?
There's a box that says 'Find rows and notes'. That sounds like a name search, not a query. I'll
look at the table first, that's where I live."

**01 -- `--click "Table"`.** "OK, a table. id, links in, links out, links total, kind, country.
Country is here, GB on the first row. Says 'Rows 381 to 420 of 3,000' -- why am I on page ten when I
just opened it? Columns: 10 of 12. I don't see 'flagged' in the visible columns, it's off to the
right somewhere. No filter row on the headers, no where-clause box. In Splunk I'd just type
`flagged=true country=GB | table id`."

**02 -- `--click "Full graph"`.** "There's a funnel icon labeled 'Full graph' at the top -- funnel
means filter, let's see. ... Wait. Now it says '812 of 3,000 nodes' and it jumped me to a Data
panel, and there is already a filter on: 'amount is at least 1,000'. I didn't put that there. Did I
just turn it on by clicking that chip, or was it on all along and the chip lied by saying 'Full
graph'? Either way, any count I get now is off by a filter I didn't ask for. That's exactly the
kind of thing that gets a wrong number into a case." (On later runs, opening Data from the rail also
showed '812 of 3,000' at the top, while the Graph panel showed 'Full graph'. I could not tell which
was true.)

"Good news though: under Attributes there's 'flagged', 'country', 'riskScore', 'alertRule',
'alertTime'. So the field I need exists."

**03 -- `--click "Data" --click "flagged"`.** "Click flagged, see what it says about it. ... The
right panel says 'amount, Edge attribute'. That's not what I clicked. I clicked flagged."

**04 -- `--click "Find rows and notes"`.** "Fine, I'll try the search box with a query. It focuses.
No hint of syntax, no placeholder like `flagged:true`. I'd type `flagged=true country=GB` here and
expect nothing; it says 'rows and notes', and I have no idea if 'rows' means table rows or those
three things in the list underneath. I tried '/' and Ctrl+F in my head; nothing on screen tells me
either works." (The study tool does not let me type, so I could not find out whether the box takes a
query. A real me would have typed into it, gotten either nothing or name matches, and moved on.)

**05 -- `--click "Selection"`.** "There's a row called Selection. Maybe that's where I build a
selection. ... No, it's a style: yellow, size 1.45, opacity 40, 'Paints 0 nodes'. That's how a
selection looks, not how you make one."

**06 -- `--click "Table" --click "Columns: 10 of 12"`.** "Column picker. flagged and country are
both ticked, so they're in the table, I just can't see flagged without scrolling. Still nothing to
filter on."

**07 -- `--click "Table" --click "country"`.** "Clicking the header sorts by country. OK, if all
else fails I sort by country, scroll to GB, and eyeball the flagged column. With 3,000 rows that's
manual work I'd never trust. And it's still showing 'Rows 381 to 420', so I'm not even at the top
of the sort."

**08 -- `--click "Views"`.** "'Keep them as a named list' -- maybe that's Views. 'No saved views.
Save view'. A view is a camera and a look, I think, not a list of accounts. I'd need to have the
accounts picked first anyway."

**09 -- `--click "More"`.** "Panel menu on the right: Select all visible (Ctrl+A), Invert
selection, Reselect previous, Fit, Re-run layout ... Add note, Clear graph data. 'Select all
visible' is interesting: if I could filter down to flagged GB, I could select all visible. That's a
two-step workaround, but it's something."

**10 -- `--click "Data" --click "Add filter"`.** "Add a filter step. 'By an attribute or computed
value', 'Top of a computed value', 'Largest component', 'k-core', 'Neighbors of the selection'.
And look at the list: '2 steps, 2 on'. The amount-at-least-1,000 filter is still stacked first, so
my new step works on 812 accounts, not 3,000. My flagged GB list would silently miss every flagged
GB account that never moved 1,000. I'd have to remember to untick it."

**11 -- `... --click "By an attribute or computed value"`.** "'Pick a field' with a list: alertRule,
alertTime, country, flagged, riskScore ... a builder, not a box. Grudgingly, I'll click it
together."

**12 -- `... --click "flagged"`.** "I picked flagged. ... The filter step is still 'Kept all 812
nodes', the field picker closed, and the right panel is showing 'amount' again. So either my click
went to the flagged in the left-hand list instead of the one in the dropdown, or it does the same
broken thing as before. Either way, no condition on flagged got set." (The click landed on the
other 'flagged' on screen, the one in the Attributes list; I could not reach the one in the
dropdown.)

**13 -- `--click "Analyze"`.** "There's an 'Analyze' link with a palette: 'Search, or say what to
find'. Louvain, PageRank, Shortest path, Links count, Total amount. These are algorithms. I want a
WHERE clause, not PageRank."

**14 to 18 -- hovering icon buttons to learn their names** (`--hover "Select"`, `"More actions"`,
`"Options"`, `"Run"`, `"Actions"`, `"Tools"`, `"Quick select"`, `"Select by"`, and others).
"I'm hovering icons hoping one of them says 'Select where' or 'Query'. The bottom toolbar is five
icons with no labels: a flask, a play button, a cube, a list, a lightning bolt. 'Options' next to
the search box gives me New folder, Show hidden rows, Collapse all. Nothing about selecting."

**19 and 20 -- `--click "Table" --click "Table options"`.** "Table menu: Time slider, Export table
as CSV. Good, CSV export is there; that's the first thing in here I'd actually use. But it exports
the whole table, and I still can't narrow the table to flagged GB."

**21 -- `--click "Everything"`.** "Last try. 'Everything' row, Style tab: 'Paints 3,000 nodes',
fill color 6366F1, which is a purple, and the graph is gray. So the swatch doesn't match what I see
either. No select-by-attribute here."

"That's it. I've spent more than my 90 seconds on 'where is the query'. In my real job I'd export
the CSV, open it in pandas, `df[(df.flagged) & (df.country == 'GB')]`, and save that cell in my
notebook. Done in thirty seconds, and I can rerun it next month."

## Commands run

```
timeout 120 node app-b/study.mjs --try $D/01.png task:t10-transactions --click "Table"
timeout 120 node app-b/study.mjs --try $D/02.png task:t10-transactions --click "Full graph"
timeout 120 node app-b/study.mjs --try $D/03.png task:t10-transactions --click "Data" --click "flagged"
timeout 120 node app-b/study.mjs --try $D/04.png task:t10-transactions --click "Find rows and notes"
timeout 120 node app-b/study.mjs --try $D/05.png task:t10-transactions --click "Selection"
timeout 120 node app-b/study.mjs --try $D/06.png task:t10-transactions --click "Table" --click "Columns: 10 of 12"
timeout 120 node app-b/study.mjs --try $D/07.png task:t10-transactions --click "..."        # nothing on screen is called "..."
timeout 120 node app-b/study.mjs --try $D/07.png task:t10-transactions --click "Table" --click "country"
timeout 120 node app-b/study.mjs --try $D/08.png task:t10-transactions --click "Views"
timeout 120 node app-b/study.mjs --try $D/09.png task:t10-transactions --hover "More"   (also "More actions", "Select", "Options")
timeout 120 node app-b/study.mjs --try $D/09.png task:t10-transactions --click "More"
timeout 120 node app-b/study.mjs --try $D/10.png task:t10-transactions --click "Data" --click "Add filter"
timeout 120 node app-b/study.mjs --try $D/11.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value"
timeout 120 node app-b/study.mjs --try $D/12.png task:t10-transactions --click "Data" --click "Add filter" --click "By an attribute or computed value" --click "flagged"
timeout 120 node app-b/study.mjs --try $D/13.png task:t10-transactions --click "Analyze"
timeout 120 node app-b/study.mjs --try $D/14.png task:t10-transactions --hover "Select"
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --hover "Add row"     # nothing on screen is called "Add row"
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --hover "Rows menu"   # nothing on screen
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --hover "Graph menu"  # nothing on screen
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --hover "Panel menu"  # nothing on screen
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --hover "Row actions" # nothing on screen
timeout 120 node app-b/study.mjs --try $D/15.png task:t10-transactions --click "Options"
timeout 120 node app-b/study.mjs --try $D/16.png task:t10-transactions --click "Analyze" --key End
timeout 120 node app-b/study.mjs --try $D/17.png task:t10-transactions --click "Data" --click "country"
timeout 120 node app-b/study.mjs --try $D/18.png task:t10-transactions --hover "Run"  (also "Actions", "Automate", "Tools", "Quick select", "Select by"; no tooltip appeared)
timeout 120 node app-b/study.mjs --try $D/19.png task:t10-transactions --click "Table" --click "Column menu"  (also "Column options", "country menu", "Filter")
timeout 120 node app-b/study.mjs --try $D/19.png task:t10-transactions --click "Table" --click "Column options"
timeout 120 node app-b/study.mjs --try $D/20.png task:t10-transactions --click "Table" --hover "Table menu"  (also "Table options", "More table actions")
timeout 120 node app-b/study.mjs --try $D/20.png task:t10-transactions --click "Table" --click "Table options"
timeout 120 node app-b/study.mjs --try $D/21.png task:t10-transactions --click "Everything"
```

## Debrief

**Did I succeed?** No. I never got a single account selected, let alone a named list.

**Single Ease Question (1 = very difficult, 7 = very easy):** 1.

**Would I use this instead of my current tool?** No. "Select every X where field = value" is the
first thing I do in any tool, and I could not find it in here. The only place I could build a
condition was a filter, and that filter hides things rather than picking them, it was already
stacked behind a filter I didn't add, and clicking a field showed me a different field. Even if I'd
gotten it to work, I'd have had to filter, then 'Select all visible', then figure out how to name
it, which is three tools for one WHERE clause. The CSV export is the one thing I'd use: get the data
out, query it in my notebook.

What would change my mind: a box where I type `flagged = true and country = "GB"`, a count of what
it matched right next to it, and a 'save as' that keeps both the query and the list, so I can run
it again on April's file.
