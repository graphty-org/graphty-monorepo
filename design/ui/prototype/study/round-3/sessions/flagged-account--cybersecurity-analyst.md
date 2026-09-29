# Session: "Clear it or refer it?" -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona: study/personas/cybersecurity-analyst.md).
Screens, in the order given: Find, the Inspector, the filter chip and its steps, the Notes panel, the Export dialog. Each seen as its rendered PNG, dark theme; a control's behaviour read from the page only where she clicked it.
Task as given: "An alert flagged account ACC-365386. Decide whether to clear it or refer it, and keep what you would need to justify that."

Outcome: she could not work the alert. The account is not in the graph on the first four screens; it turns up only as one row of someone else's evidence file on the last. She would refer it on the strength of a list she did not build, and says so. SEQ 2.

## 1. Find

"Account alert. Not really my queue -- this is AML-shaped, not a hunt -- but the move is the same: pull the entity, look at who it talks to, when, and how much. First thing, search box."

"There's one, top left, already focused, 'Name, id or value'. Tooltip: finds nodes, edges, sets, paths... 'Paste a list of ids to find them all.' OK, that I like -- when I come off a Splunk search I have twenty ids in the clipboard, not one. And 'Esc closes Find; the selection stays.' Fine."

"Keyboard. There's a hint at the bottom of the left panel, Enter select, Esc close, F6 next region. Nothing says '/' or Ctrl+F opens it. I'd try both. If Ctrl+F gives me Edge's find-in-page instead I'll be annoyed."

"Now -- the title says 'Les Miserables'. Seventy-seven nodes. Valjean, Fantine, Thenardier. That's not transfers. Where's my account?"

"I'll type it anyway. ACC-365386. ... [the no-match state] '0 results in all 77 nodes. 0 matches; Closest: Thenardier.' So it isn't here. Wrong file loaded, or I'm in the wrong project. There's a chevron next to 'Les Miserables', probably the project switcher. Nothing on this screen tells me where my alert data is."

"And that 'Closest:' thing. On character names, cute. On account ids that is dangerous. If I fat-finger ACC-365836 and it offers me 'Closest: ACC-365386' as a link, some tier-1 at 4 a.m. clicks it and works the wrong account. For ids I want exact or nothing, and I want it to say 'no account with that id', full stop."

"Moderator says keep going, next screen."

## 2. Inspector

"Different graph again. 'Human protein interactions', TP53. OK, I'll read it for what it would do on an account."

"Right column: the name, 'Neighbors' button, 'Path to...'. Tooltip on Neighbors: 'Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it.' That's the pivot. Telling me the count before I press it -- good, that's the Sentinel problem where I expand and get two hundred things I didn't ask for. Here I know it's 33 before I commit."

"Attributes with rank: degree 32, '#2 of 300'. Betweenness, pagerank. I don't care about betweenness on a single flagged account."

"There's a transfers one further down [the busiest-merchant crop and the 7,495-selected state]. 'Transfers, March 2026', 3,000 nodes. Finally, money. ACC-393859, a merchant: Connections In 907, Out 0. Split in and out -- yes, that's what I need for mule behaviour, lots in, fan out, cash out. The big selection shows 'amount, edges $9,540,249.05' and 'Mule ring holds 13 of 7,495'. So amounts live on the edges."

"But not MY account. Is ACC-365386 in this graph? I'd type it in Find here, but I'm not shown that. Assume it's there."

"What I don't see anywhere in the inspector: time. 'March 2026' in the project title is the only time range on the screen. The first/last transfer for this account, the hops in order -- none of that. For an account alert the timeline IS the case. Money in on the 3rd, out on the 3rd, within the hour, to three new counterparties -- that's a refer. Same amounts spread over the month to the landlord and Tesco -- clear. I can't tell those apart from a degree and a riskScore."

"And 'riskScore 92' -- whose score? Came in with the file, I assume. It doesn't say."

## 3. Filter chip and its steps

"Back to Les Mis. 'Filtered: 28 of 77 nodes, 3 steps.' Popover: Filter to Largest component, 76. Filter to degree >= 5, 41. Filter out group = 8, 28. Counts at each step -- good, that's how I'd sanity-check a Splunk pipeline, row counts after each pipe."

"Editing a step: dropdown 'degree', dropdown '>=', box '5'. Scope 'after step 1: 76 nodes', result 'leaves 41, takes out 35'. It's clear. It's also a dropdown builder. Where do I type the query? For this alert I'd want 'transfers from ACC-365386 where amount between 9000 and 9999 in the last 72 hours' -- structuring. Can a step be on an edge attribute? On a date? The dropdown only shows 'degree'. If I can't filter transfers by time and amount, the chip doesn't help me with this alert."

"Nice that there's 'Add note' on a step. That's where I'd write why I narrowed."

## 4. Notes panel

"First state, 'Empty': Notes is lit on the rail and the left panel is just... blank. Nothing. No 'add a note', no line of text. I thought it hadn't loaded. On the right under the graph statistics there's 'Notes' with a plus. So you add them from the thing, not from the panel. Took me a second."

"With notes: 'About TP53 neighborhood, 33 proteins' -- 'Cites Betweenness, full graph', and the note card has 'QUOTES: TP53 betweenness 0.114'. The number I wrote is pinned to where it came from. That is actually the thing I want for a case: my note says riskScore 92 and it's tied to the file and the row, not typed by hand."

"'Out of date' state: 'Earlier run -- Use current', 'Detached -- Restore set'. So if the data changes under my note it tells me. Good. I'd trust that more than my notebook, honestly, which just goes stale silently."

"What's missing for this task: there's no verdict. I don't need the tool to track my queue, but 'Cleared / Referred, by Priya, 28 Sep, because...' as a note type would be the thing I'd paste into the case. I'll just write it as text."

"And -- is there a log of what I did? The filter steps are a kind of record. The notes are a record. But which searches I ran, which neighbors I expanded, in order -- not here. My notebook has that."

## 5. Export dialog

"Evidence file state. 'Mule ring, case ACC-233575', scope 'Filtered: 14 nodes, 1 step: in Mule ring suspects.' Page 1, Boundary. And there it is -- ACC-365386, personal, GB, riskScore 92, degree 8, PageRank 0.000385. Eighth row. So my account is one of fourteen in somebody else's mule-ring case."

"That's the only place in this whole session I've seen the account. And what it tells me is: someone put it in a fixed set called 'Mule ring suspects'. That's not evidence. That's a label. If I refer because it's on this list, and the list was built from the riskScore, and the riskScore is what fired the alert, I've gone in a circle. My lead would ask 'what did you actually look at?' and the answer would be 'a table that agreed with the alert'."

"The CSV side, though. 'Export table as CSV': rows '14 of 3,000, filtered', from 'Nodes; 1 filter step', order riskScore highest first. First lines of the file shown before I save, raw ids. And a methods file beside it: data file name, 3,000 accounts, 9,113 transfers, directed, how nodes were built from from_account and to_account, amount read as USD, 'timestamp kept as text', pagerank settings, graphty-element version. That is exactly what I'd staple to a case. The CSV itself is clean, no comment lines, drops straight into Splunk. Best thing I've seen today."

"But: 'timestamp kept as text'. So the tool loaded the time and then didn't use it as time. That's why there's no timeline anywhere. For an account alert, that's the whole problem in one line."

"The Nodes table exports. Where's the EDGES table -- the actual transfers, with amount and timestamp, for this one account? That's the evidence. Fourteen account rows with a riskScore is a list of suspects, not proof."

"File name is 'case-acc-233575_nodes.csv' -- someone else's case number. I'd have to rename it for mine, fine, it's a text box."

"Bottom line: '1 file goes to your Downloads folder. Nothing is uploaded.' Left rail: 'Assistant Off. Nothing is sent.' Good. That's the phone-home answer on the screen where it matters. 'File format: the owner's decision' next to the evidence file name -- no idea what that means. Whose decision, mine? Is it going to ask me? Looks unfinished."

## Decision

"Refer. riskScore 92, in a fixed set of 14 mule-ring suspects, degree 8. And I'd be embarrassed writing it up, because I haven't seen a single one of its transfers, their amounts, or when they happened. What I'd keep: the nodes CSV and its methods file, renamed to my case, plus a note that says 'referred on membership of the ring list; transfers not reviewed -- tool showed no timeline'. That last line is me covering myself."

## After the task

**Single Ease Question:** 2 of 7.

"It's a 2 because I never got to the account. Four of five screens were novels and proteins. On the fifth, my account is a row in a table somebody else built."

**Would you use this instead of your current tool?**

"For this, no. For an account alert I need the transfers in time order with amounts: in, out, how fast, to whom new. Splunk gives me that in one search and a table. Nothing here showed me time as time."

"What would pull me over: the methods file beside the CSV, the notes that quote the number and its source and go stale out loud, the step counts on the filter, and Neighbors telling me the count before I press it. Those beat my notebook. Give me a query box that can filter edges by amount and time, and one account's transfers as a sequence, and I'd try it on the next one."
