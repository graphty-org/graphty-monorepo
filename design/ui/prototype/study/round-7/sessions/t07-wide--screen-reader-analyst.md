# Session: wide IT estate, filter production hosts by connection count -- screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "You want to work only with production hosts that talk to at least
three other hosts. How many hosts does that leave, and how many would there have been if you had
not first limited it to production? The data on screen is a sample: a company's IT estate, hosts
and the network connections between them, with dozens of things recorded about each. If that is
not your line of work, treat it as your own wide spreadsheet."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t07-wide--screen-reader-analyst/`. Morgan works by screen reader; each step
below is what the screen shows, read as Morgan would hear the named controls.

## Start screen (shots/tasks/t07-wide/01.png)

"Title: IT estate, March 2026. Then a toolbar: Local only -- good, that's my first question
answered before I asked it. 'Full graph'. A left rail: Graph, Data, Views, Notes, Assistant. A
summary on the right: 300 nodes, 1,105 edges, directed, 7 isolated, average total degree 7.37,
highest 25. That's the overview I want first, and it's in words. Fine.

Directed. So 'talks to at least three other hosts' -- in or out or either? The tool says 'total
degree', so I'll assume total. I'm writing that assumption down. At the bottom: Table, Nodes,
Edges, 'Columns: 8 of 69'. I'm going to the table, that's where I live."

## Step 1 -- open the table

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t07-wide--screen-reader-analyst/01.png task:t07-wide --click "Table"
```

"Table opened. '300 nodes from hosts-2026-03.csv'. Columns id, hostname, fqdn, ip_address,
mac_address, role, and one cut off. Eight of sixty-nine shown. No environment column, no degree
column. I'm not going to scroll sixty-nine columns. I want a filter. The toolbar said 'Full
graph' -- that sounds like the thing that says what's limited."

## Step 2 -- "Full graph"

```
timeout 120 node app-b/study.mjs --try .../02.png task:t07-wide --click "Full graph"
```

"It moved me to Data. Sources: hosts csv, 300 nodes; connections csv, 1,105 rows, 1,105 edges.
Then 'Filters: No filters. Filters change what is computed; the eye in the Graph tree only hides.'
I don't know what 'the eye in the Graph tree' is and I don't have eyes for it, but the first half
is the sentence I needed: filters change what is computed. Good. 'Add filter step'."

## Step 3 -- Add filter step

```
timeout 120 node app-b/study.mjs --try .../03.png task:t07-wide --click "Full graph" --click "Add filter step"
```

"A menu, 'Keep': By an attribute or computed value; Top of a computed value; Largest component;
k-core; Neighbors of the selection, disabled, 'select one or more nodes first'. Good that the
disabled one says why. k-core is tempting for 'at least three', but k-core is not the same thing
as degree at least three, and I don't trust a tool to know the difference until it shows me. I'll
do production first: by an attribute."

## Step 4 -- by an attribute

```
timeout 120 node app-b/study.mjs --try .../04.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
```

"A field picker opens with a search box focused: 'Find attribute'. Long list, alphabetic, cmdb
this, cpu that. I'll ask for environment."

## Step 5 -- clicked "environment" (wrong target)

```
timeout 120 node app-b/study.mjs --try .../05.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "environment"
```

"That's not what I wanted. The picker closed and I'm on a page about the attribute 'environment':
category, 300 of 300 have a value, three distinct values -- prod 187 hosts, staging 67, dev 46.
Useful, honestly; I'll keep '187 prod' in my notes. But my filter still says 'New step', 'Kept all
300 nodes'. There are two things called 'environment' on this screen, the one in the attribute
list on the left and the one in the picker, and I got the wrong one. I can't tell them apart by
name. Back up and type into the search box instead."

## Step 6 -- typing into the field search

```
timeout 120 node app-b/study.mjs --try .../06.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --type "environment"
timeout 120 node app-b/study.mjs --try .../07.png task:t07-wide --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --key e --key n --key v
```

"First try did nothing I could hear. Typed it letter by letter: 'env', '1 match', environment,
highlighted. Good, the match count is said in words."

## Step 7 -- Enter picks it

```
timeout 120 node app-b/study.mjs --try .../08.png ... --key e --key n --key v --key Enter
```

"Condition: environment, is, and an empty text box with focus. The step in the list is now named
'environment is'. Still 'Kept all 300 nodes', which is right, I haven't given a value."

## Step 8 -- type prod

```
timeout 120 node app-b/study.mjs --try .../09.png ... --key Enter --key p --key r --key o --key d
timeout 120 node app-b/study.mjs --try .../10.png ... --key p --key r --key o --key d --key Enter
timeout 120 node app-b/study.mjs --try .../11.png ... --key p --key r --key o --key d --key Tab
```

"Typed prod. The step renames itself to 'environment is prod'. And then: 'Kept all 300 nodes'.
'This step: 300 of 300 nodes'. Pressed Enter: same. Tabbed out to 'Apply this step', checked:
same. 300 of 300.

The attribute page told me two minutes ago there are 187 prod hosts. So either the filter is not
running, or 'prod' doesn't mean what the tool says it means, or it hasn't caught up. Whatever it
is, it isn't telling me. The step's own name says 'environment is prod' and its own count says it
kept everything. Those two facts can't both be true. That's a dead end."

## Step 9 -- checking the result, and the value box

```
timeout 120 node app-b/study.mjs --try .../12.png ... --key e --key n --key v --key Enter --key ArrowDown
timeout 120 node app-b/study.mjs --try .../13.png ... --key Enter --key p --key r --key o --key d --key Enter --click "300 of 300 nodes"
```

"Down arrow in the empty value box: no list of values. I have to know the spelling myself; I only
know 'prod' because I stumbled onto the attribute page. Then I followed '300 of 300 nodes' to see
what it kept. It took me back to the Graph and the table: 300 nodes, and the first rows are
lb-dev-sgp-01, lb-staging-sgp-01. Dev and staging are in there. The summary on the right still
says 300 nodes. And the toolbar still says 'Full graph', with a filter step that's switched on.
So the filter did nothing, and nothing anywhere says so."

## Step 10 -- fallback: export

"That's my second dead end. I'm switching to what I always do: get the table out and do it in
pandas."

```
timeout 120 node app-b/study.mjs --try .../14.png task:t07-wide --click "Table" --click "More"
timeout 120 node app-b/study.mjs --try .../15.png task:t07-wide --click "Table" --click "Export"
timeout 120 node app-b/study.mjs --try .../16.png task:t07-wide --click "Table" --click "Table actions"   (nothing on screen is called that)
timeout 120 node app-b/study.mjs --try .../16.png task:t07-wide --click "Table" --click "Table options"
```

"'More' opened a menu about the whole graph -- select all, re-run layout, clear graph data. Not
the table. There is more than one 'More' here and I got the graph's. Nothing called 'Export'.
'Table options' finally: 'Time slider, this data has no time attribute' and 'Export table as
CSV'. There it is. But the node table has no degree column that I could find, so I'd have to
export the connections table too and count edges per host myself. That's NetworkX's job, and
NetworkX already does it."

## Step 11 -- one last look at the operator

```
timeout 120 node app-b/study.mjs --try .../17.png ... --key e --key n --key v --key Enter --click "is"
timeout 120 node app-b/study.mjs --try .../18.png ... --key e --key n --key v --key Enter --click "is" --click "is one of"
```

"I gave the operator one chance in case 'is' wanted something else: is, is not, is one of, is
empty, is not empty. 'Is one of' gives me the same empty text box and still 300 of 300. No list
of the three values to pick from, even though the tool knows there are exactly three. I'm done."

## Outcome

Did I succeed? No. I have one number I trust: 187 production hosts, which I read off the
attribute page, not out of a filter. I have no number for "talks to at least three other hosts",
either with or without the production limit. The filter step I built names itself "environment
is prod" and reports keeping all 300 hosts, and nothing tells me why. My answer to the moderator
would be: "187 prod hosts before the connection limit. The rest I'd do in Python from the two CSV
exports."

I also never learned whether "talks to" means connections in, out, or either. The graph is
directed and the summary says "total degree". I'd have assumed total and said so.

Single Ease Question: 2 out of 7. The overview, the 'Local only' label, the disabled-with-a-reason
menu item and the "1 match" count were all good. But the core action, a filter, looked like it
worked and didn't, and the only way I found out was by checking the table against a number I'd
found by accident.

Would I use this instead of my current tool? No, not for this. In pandas this is two lines and the
numbers come out the same every time. Here I built a filter that announces itself as applied and
changes nothing. A tool that tells me "environment is prod, kept 300 of 300" when it has also told
me there are 187 prod hosts is worse than one that tells me nothing, because I might not have
checked. I'd keep the attribute summary page -- distinct values with counts, in words, is a nice
skim -- and the CSV export. Everything else here, I'd still be double-checking in Python.

## Problems noticed, in Morgan's words

1. "The filter step said 'environment is prod' and 'Kept all 300 nodes' at the same time. The
   tool knew there were 187 prod hosts. Nobody said why." (Blocking.)
2. "After the filter was switched on, the toolbar still said 'Full graph', the summary still said
   300 nodes, and the table still had dev hosts in it. I couldn't tell anything was filtered,
   and in this case nothing was."
3. "The value box is free text. Down arrow gives nothing. The tool knows there are three values;
   let me pick one instead of guessing the spelling."
4. "Two things called 'environment' -- one in the attribute list, one in the field picker. I
   clicked one and got the other."
5. "Two buttons that answer to 'More'. I got the graph's menu, with 'Clear graph data' in it,
   when I wanted the table's. The table's is 'Table options'; I found it by guessing."
6. "There's no degree column in the table and no way I found to filter on connection count
   without picking k-core, which is a different thing. 'Top of a computed value' and 'k-core'
   are there; 'at least N connections' isn't, or I couldn't hear it."
7. "The graph is directed. 'Talks to' could be in, out or both. The tool says 'total degree'
   once in the summary and nowhere near the filter."
8. "'The eye in the Graph tree only hides.' I don't have an eye. Say what the control is called."
