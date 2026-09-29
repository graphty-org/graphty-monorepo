# Session: how two accounts are connected, weighted by amount -- Priya, SOC threat hunter

Participant: Priya, senior threat hunter at a regional bank (persona:
`study/personas/cybersecurity-analyst.md`). Simulated session, played in character.

Task as given by the moderator, and nothing more: "Starting from two selected accounts, find how
they are connected, weighted by amount, and get the transfers with amounts and dates out."

Screens, in the order she met them (all rendered dark, study view, 1440 by 900):

1. `screens/inspector.html#two` -- two nodes selected, Paths between... open
   (`shots/r3-priya-howconn-inspector-two.png`; drawn on the protein graph, TP53 and SMAD3)
2. `screens/inspector.html#path-to`, `#path`, `#kept-path` -- the one-node Path to... bar, a found
   path and the kept path (`shots/r3-priya-howconn-inspector-path-to.png`, `-path.png`,
   `-kept-path.png`; also proteins)
3. `screens/sets-and-paths.html#s3` -- the path bar on March transfers, From outside the filter
   (`shots/r3-priya-howconn-sap-s3.png`)
4. `screens/sets-and-paths.html#s6` -- "No directed path; one exists ignoring direction"
   (`shots/r3-priya-howconn-sap-s6.png`)
5. `screens/sets-and-paths.html#s4` -- the found path, unweighted, with the Edges tab in path
   order (`shots/r3-priya-howconn-sap-s4.png`)
6. `screens/sets-and-paths.html#s5` -- "amount: what it means"
   (`shots/r3-priya-howconn-sap-s5.png`)
7. `screens/table-dock.html#out` -- the two equal paths as edge rows with timestamp, hop and
   amount, and the Export table as CSV dialog (`shots/r3-priya-howconn-td-out.png`)
8. `screens/table-dock.html#selected` -- the table header with "Export table as CSV..."
   (`shots/r3-priya-howconn-td-selected.png`)

## Transcript

**Before starting.**

> "Transfers. Not my day job, but it's the same shape as what I do -- account to host to host,
> just with dollars instead of logons. 'Weighted by amount', fine. Same three questions as
> always: approved, where does it run, does it phone home. There's a thing in the left rail that
> says 'Assistant. Off. Nothing is sent.' OK, that's one sentence I'd actually want. It doesn't
> tell me where the file lives, though. In a real trial I'd stop and ask. Carrying on because
> it's a study."

**Screen 1: the inspector with two things selected.**

> "The moderator says start from two selected accounts. This screen has... TP53 and SMAD3.
> Those aren't accounts, those are genes. Whatever, I'll assume it's the same panel on my data.
> Right side says '2 selected', Nodes, Neighbors, and a full-width button 'Paths between...'.
> Good, that's the verb I want, and it's where my eye already is. I click it."

> "Popout: 'Paths between. On: full graph, 300 nodes. Undirected.' From TP53, To SMAD3, a swap
> arrow. 'Weight by: None: count hops.' There it is. I want amount. I open the dropdown."

She reads the HTML for the dropdown and finds only the closed field drawn; the note says choosing
an edge column "goes through the weight-meaning question".

> "The mock doesn't open it. So I don't know what's in there. I'm guessing 'amount' is in the
> list. Default is hop count, which is honest -- at least it's not secretly using some column I
> didn't pick. It also says 'Undirected' right up top. For money that's wrong, a transfer has a
> direction. I'd want that to say 'follows transfers' by default. Noticed it, moving on."

> "'Every shortest path is found and drawn together.' OK. I like that better than BloodHound
> handing me one path and hiding the ties."

**Screen 2: the protein path states.**

> "Path to... on one node: 'Pick the end node: click, or find it by name (Ctrl+K). Esc cancels.'
> Ctrl+K, good, I'd use that, I don't want to hunt a dot. The From/To bar at the bottom is
> clear."

> "Found path: '3 hops, 1 of 12'. Twelve equal paths and I'm on one. Members in walk order,
> 'edge confidence 0.82'. And a footnote: 'The path counts hops; edge confidence is shown, not
> used.' Good. That's the sentence I needed. If I'd weighted it I'd want the same line saying
> what *was* used."

> "Kept path shows up in the left list as 'TP53 to SMAD3, path, 4'. Fine, I can come back to it."

**Screen 3: the path bar on the transfer graph.**

> "Now it's actual accounts. 'Filtered: 1,071 of 3,000 nodes' at top left. Bar: From
> ACC-271813, To ACC-233575, Scope has a yellow warning 'Filtered graph', Weight 'amount:
> numbers, not used'. Under it: 'From is outside the filtered graph. Set Scope to Full graph to
> search it.' Run is greyed."

> "That's a good error. It tells me exactly why and what to change. In most tools I'd get zero
> results and wonder. But 'amount: numbers, not used' -- is that telling me amount is selected
> and it's being ignored? Or it's a description of the column? I read that three times. If I
> picked amount, why is it 'not used'?"

**Screen 4: no directed path.**

> "'No directed path; one exists ignoring direction' and a button 'Ignore direction'. Good.
> That's the lateral-movement question in a sentence: can it actually get there going forwards,
> or only if I cheat. I'd keep direction on and write down that the answer is no. I'd like to
> know which hop is backwards, though."

**Screen 5: the found path.**

> "Zoomed in, start and end badges, arrows on the edges. Right panel: 'Found path (unweighted)',
> 3 hops. Created from: Query 'Shortest path', Scope Full graph 3,000, Weight 'amount: numbers,
> not used', then 'Paths ignore amount: hops were counted, not dollars.' Direction 'follows
> transfers'. 'Ties: 1 of 2 as short'."

> "OK so now I get it. The weight field just says amount exists; the path didn't use it. That's
> honest. But that's not my task. My task says weighted by amount, and this is hops. So where
> do I turn it on? The Weight row is in 'Created from', it's a record of the past run, not a
> control. I'd go back to the bar and change Weight. The bar shows the field as a text box, I'd
> click it."

> "Bottom table: Edges tab, 'Selected: 3 edges, in path order.' step, source, target, amount.
> $3,530.28, $9,782.05, $9,616.72. Where's the date? No time column. The task literally says
> amounts and dates. And 'Ties: 1 of 2' but the table only shows three rows -- where's the other
> path's transfers?"

**Screen 6: amount, what it means.**

She clicks the Weight row.

> "'amount: what it means. Applies to every result that reads amount. For amount, a higher
> number means: a closer or stronger link. A path prefers big transfers.' And 'How it is
> converted', collapsed."

> "Right. This is actually the question I'd get wrong in networkx -- weight is a cost there, so
> big amounts make the path longer and you end up following the pennies. This asks me in words.
> 'A path prefers big transfers' -- yes, that's follow the money. I'd pick that. Credit where
> it's due, that's the one screen in here that knows something I've been burned by."

> "Then what? There's no Run on this card. Does it re-run the path? Does it make a new result?
> 'Applies to every result that reads amount' -- so it'll quietly change other things too?
> I don't see the weighted path anywhere. I'm going to assume it re-runs and the header changes
> from '(unweighted)' to '(weighted)'. I didn't see it happen."

**Screen 7: the transfers in the table, with dates.**

> "This one I like. 'Selected: 5 edges on 2 paths.' from_account, to_account, timestamp 'UTC;
> 2026-03-04 to 2026-03-09', hop, amount, 'on paths 2 of 2 / 1 of 2'. So both tied paths, all
> five transfers, one table. And timestamps."

She checks the times against the hops.

> "Path one: 03-04 18:23, 03-07 13:27, 03-08 20:29. Path two: 03-04, 03-07 00:11, 03-09 10:57.
> Both go forward in time, so both are real sequences, not just connectivity. Good. I'd want
> the tool to tell me that, not make me eyeball it -- if a hop went backwards in time it isn't
> a flow, it's a coincidence. UTC named once in the header, fine."

> "But this is a different screen from the last one. Here I get timestamp and 'on paths'. Back
> in the path screen I got step and dollar signs and no date. Which one is the product?"

**Screen 8: getting it out.**

> "'Export table as CSV...' top right of the table. That's where I'd look. The dialog they drew
> is for proteins -- 'All 300: Nodes, full graph', 'ppi-core-300-nodes.csv' -- but it shows
> Rows, Order, Columns, a preview of the first lines and a file name. For mine I'd expect 'Rows:
> 5 selected edges'. The CSV sample at the bottom has 'timestamp (UTC), amount (USD)' in the
> header, ISO time with a Z. That's pasteable into Splunk, I'd take that."

> "One thing: does 'Rows' default to what's selected or to all 9,113? The drawn one says 'All
> 300'. If I export and get nine thousand rows when I wanted five, I'm annoyed but I'd notice.
> Also, on the path screen the table header only had a search and a dots menu, no Export. I'd
> have gone to the dots."

> "And the inspector for a found path has an 'Export' row at the bottom with a copy icon and a
> plus. No idea what either does. Copy what? I wouldn't click it."

**Done.** She says she would call it done, with a caveat.

> "I found how they're connected, I found the switch for weighting and it asked me the right
> question, and I'd get five rows with times and amounts out as a CSV. What I never saw is the
> weighted answer. Every path on screen says unweighted. So I've done the task on faith for the
> middle step."

## After the task

**Single Ease Question: 4 of 7.**

> "Four. The start and the end are easy -- Paths between is where I'd look, the CSV has what I
> want. The middle is where it cost me. 'amount: numbers, not used' made me stop, weight lives
> in a panel that looks like history, and I never saw the path change after I picked amount."

**Would she use this instead of her current tool?**

> "For this? My current tool is a notebook and networkx, and I'd have done it in ten lines --
> but I'd also have got the weight backwards the first time, and this caught that. The 'follows
> transfers' / 'no directed path' bit and the time-ordered hop table are things I'd have to
> write myself. So: maybe, for walking a specific pair, if it's on the approved list and runs
> locally. Not instead of the notebook -- beside it. And there's still no box I can type a query
> into; I'd want 'shortest path from A to B where amount > 1000 and time increasing' as a line,
> not four clicks."

## Problems she ran into

1. **The weighted result is never shown.** Every found path is "(unweighted)"; after she answers
   "a higher number means a closer or stronger link" there is no Run on the card and no state
   showing the path re-run by amount. She finished the task on faith. (Severity 3)
2. **"amount: numbers, not used" reads as a contradiction** in the path bar before a run. She
   thought she had picked amount and it was being ignored. The found-path panel's sentence
   "Paths ignore amount: hops were counted, not dollars" is what finally explained it. (Severity 3)
3. **Weight is changed from a row under "Created from"**, which reads as a record of a past run,
   not a control. She expected to change it in the path bar or the Paths between form. (Severity 2)
4. **The path's edge table in the sets-and-paths mock has no date column and only one of the two
   tied paths**, while the table-dock mock of the same path has timestamp, both paths and "on
   paths". The two screens disagree about the core of her task. (Severity 3)
5. **Paths between... defaults to "Undirected"** on the two-node form. For transfers she wants
   direction on by default; the found-path panel later says "follows transfers", so it is unclear
   which one a run on accounts would use. (Severity 2)
6. **The two-node Paths between form is drawn on proteins, and its Weight by dropdown never
   opens**, so she never saw amount offered as a choice from the place the task starts. (Severity 2)
7. **Nothing checks that the hops go forward in time.** She verified it by reading timestamps; a
   path whose hop goes backwards in time is not a money flow. (Severity 2)
8. **Export is unclear from the path screen**: the table header there has only search and a dots
   menu; the inspector's "Export" row has an unlabeled copy and plus. The Export table as CSV
   dialog drawn defaults to "All" rows, not the selected five. (Severity 2)
9. **No query box.** She would rather type the path query with its conditions. (Severity 2)

## What she liked

- "Paths between..." as a full-width button the moment exactly two things are selected.
- "From is outside the filtered graph. Set Scope to Full graph to search it." -- the error says
  why and what to change.
- "No directed path; one exists ignoring direction" with an "Ignore direction" button.
- "amount: what it means ... A path prefers big transfers" -- asks the cost-versus-strength
  question in plain words.
- The edge table with timestamp (UTC named once), hop, amount and "on paths" for all equal paths,
  and a CSV header with units.
