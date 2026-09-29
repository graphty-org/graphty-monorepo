# Session: how is one account connected to another -- Priya, threat hunter at a regional bank

Participant: Priya, senior threat hunter in a bank SOC (persona:
`study/personas/cybersecurity-analyst.md`). Simulated session, played in character.

**Task given by the moderator, and nothing more:** "How is ACC-271813 connected to ACC-233575?"

This task was last run in round 3 (ease 4.2 across participants), on the inspector and the path
bar. This time she starts on the find, inspect and expand screens, which no participant had seen.

**Screens seen, in order, as the participant sees them (design notes hidden), dark theme, 1440 by
900:**

1. Find and expand, state 1, "Find the seed" -- `shots/screens__find-and-expand--t-find--dark.png`
   (and the task's own light render, `shots/tasks/how-connected/01-find-and-expand-t-find.png`)
2. Find and expand, state 2, "Inspect the hit" -- `shots/screens__find-and-expand--t-inspect--dark.png`
3. Find and expand, state 3, the Neighbors menu with hop counts --
   `shots/screens__find-and-expand--t-size--dark.png`
4. Find and expand, states 4 to 9 (a filtered neighbourhood, a hit the filter leaves out, growing
   one hop, the triage list, keeping the step) -- `shots/screens__find-and-expand--t-click--dark.png`,
   `--t-outside--dark.png`, `--t-grow--dark.png`, `--t-grown--dark.png`, `--t-triage--dark.png`,
   `--t-keep--dark.png`
5. The task's second page: the inspector with a huge selection --
   `shots/tasks/how-connected/02-inspector-cap.png`
6. Find, with its help tooltip (Les Miserables) -- `shots/r6-priya-howconn-find-s1.png`
7. Inspector, two nodes selected, and one node with Path to... (proteins) --
   `shots/r6-priya-howconn-inspector-two.png`, `shots/r6-priya-howconn-inspector-path-to.png`
8. Sets and paths, landing state (two sets focused) -- `shots/tasks/how-connected/03-sets-and-paths.png`
9. Sets and paths, the path bar with From outside the filter -- `shots/r6-priya-howconn-sets-and-paths-s3.png`
10. Sets and paths, the reverse direction: no directed path -- `shots/r6-priya-howconn-sets-and-paths-s6.png`
11. Sets and paths, the found path with its edges -- `shots/r6-priya-howconn-sets-and-paths-s4.png`
12. Sets and paths, what amount means in this run -- `shots/r6-priya-howconn-sets-and-paths-s5.png`

---

## Think-aloud

### 1. Find the seed

> Two account IDs. That's a pivot question: is there a chain from one to the other, and in what
> order. Top left still says "Nothing has been sent from this project" and the rail says
> "Assistant Off. Nothing is sent." Fine, I've read those before; moving on.
>
> Search box already has "233575" in it, scope "This graph", one hit: ACC-233575, riskScore 98.
> "Searching the full graph: 3,000 nodes." Good -- it tells me what it searched. The table under
> the graph agrees: ACC-233575, US, 98, flagged, degree 8. That's my ground-truth check done in
> five seconds.
>
> I'd actually have typed both IDs. Can I? The box only shows one. I'm going to try "271813"
> next, but first I'll see where this one leads.

### 2. Inspect the hit

> Clicked it. Right panel: ACC-233575, flagged true, riskScore 98, "#1 of 3,000", personal, US.
> Connections table: In 3, Out 5, All 8. Neighbors and Edges both 8. So no parallel transfers
> between the same pair. OK.
>
> Header row has "Neighbors" with a dropdown, a filter icon, a pin, three dots. What it doesn't
> have is anything that says "path". I want "how is A connected to B". I've got a button for
> "who's next to A". Those aren't the same question.

### 3. The Neighbors menu

> Opened the Neighbors dropdown. "Hops from ACC-233575": 1 hop 9 nodes, 2 hops 975 nodes,
> 3 hops 2,356 nodes. Then Follow: "In: paid by", "Out: paid to", "All".
>
> Wait -- 1 hop says 9 nodes, the Connections table says 8 neighbours. I assume 9 is the eight plus
> itself. Should say so. That's the sort of thing I'd get asked about in a review: "why is it 9
> here and 8 there".
>
> And "In: paid by 9 nodes", with 2 hops ticked. Connections says In is 3. So is 9 the two-hop
> count going in? Probably. The menu mixes a per-hop number and a per-direction number and doesn't
> say which hop count the direction row is for. I had to reason it out.
>
> But this I like: "975 is a third of the graph. Two hops pass through merchants: ACC-393859
> alone has 907 counterparties." That is exactly the Sentinel problem -- I expand, I get a
> thousand things, and nobody tells me it's because of one hub. Here it tells me before I click.
> That's real.
>
> Still not my question, though. I could filter to 2 hops and search for 271813 in the 975,
> which is how I'd do it in a notebook if I had nothing better. That's a workaround and it
> wouldn't give me the order of hops anyway.

### 4. Walking the neighbourhood (states 4 to 9)

> I went along with the flow the screens want. Filter to neighbours, 9 accounts. Clicked a
> merchant, ACC-893168: "sent no transfers: Out finds nothing. In: paid by reaches 37 accounts."
> Good, it tells me why the direction I picked is empty instead of just showing zero.
>
> Searched "782213": "Left out by ACC-233575 and neighbors. Not drawn; not in any count."
> And a one-click "Add selection to step". That's the clearest "your filter is hiding this" I've
> seen in a graph tool.
>
> Grew it one hop out, 34 accounts. The filter-steps panel lists what I did: "9 by Filter to
> neighbors, all, 1 hop, from ACC-233575", "+1 by Add selection to step", "+24 by Filter to
> neighbors, out, 1 hop, from 10 nodes". That's my notebook, roughly. I'd hand that to a junior.
>
> I scanned the 34 for 271813. It isn't there -- not on the canvas labels, not in the top of the
> table. So either it's further out or it's upstream, not downstream, and I grew "Out: paid to".
> I've spent a couple of minutes and I've learned it's not within one outward hop of this
> neighbourhood. That's a negative, and I had to earn it by eye.
>
> "Keep it with a note, then delete the step" -- frozen set of 34, fine. Not what I'm here for.

### 5. The inspector with 7,495 selected

> Next page the moderator hands me: "7,495 selected" over a lasso. Statistics say 1,863 nodes,
> 5,632 edges. 1,863 plus 5,632 is 7,495, so it's counting nodes and edges together. Title up top
> says "Transfers, March 2026"; the page before said "March transfers". Same file? I'd assume so.
>
> Honestly I don't know why I'm here. Nothing on this screen is about two accounts. I'd close it.

### 6. Find, the help tooltip

> Went looking for whether search takes more than one thing. The tooltip on Find: "Paste a list of
> ids to find them all. Ctrl+F opens Find from anywhere." Good. Ctrl+F, same as I'd try anyway.
> So I paste "ACC-271813 ACC-233575", select both, and -- if it's like the next screen -- I get
> the button I want.

### 7. Two selected, and Path to...

> These are proteins, TP53 and SMAD3, but the panel's the same. Two selected: a full-width
> "Paths between..." right under the header. From, To, Scope "Full graph", Weight "confidence,
> not used yet", Run. That's the whole thing I wanted from the start.
>
> And with one node selected there's a "Path to..." button -- "Pick the end node: click, or find
> it by name (Ctrl+K)". Also good.
>
> So why didn't ACC-233575 get a "Path to..." on the find-and-expand screens? Same panel, same
> kind of node, one selected. On the transactions graph the header was just Neighbors, filter,
> pin, dots. If that's the real product, I'd never have found the path tool from where the flow
> put me. The only other way in is the second icon on the bottom toolbar, the one that lights up
> when the path bar is open -- and on the find-and-expand screens it has no tooltip. I recognised
> it because I'd seen it lit up somewhere else. A new analyst wouldn't.

### 8. Sets and paths, landing state

> Two sets focused, an "Intersect: members in both sets" tooltip. Paid ACC-893168, 37 members.
> Not my question. Skipping to the path bar.

### 9. The path bar, From outside the filter

> From ACC-271813, To ACC-233575. Scope has a yellow warning, "Filtered graph". Under it: "From is
> outside the filtered graph. Set Scope to Full graph to search it." Run greyed out.
>
> Same message as round 3 and still the right one. It says why and what to change. The inspector
> for 271813 backs it up: "Left out by riskScore 20 or more". It's a business account, MX,
> riskScore 1, 14 links. Low score, which is exactly why it got filtered -- and exactly the kind
> of account I'd want to see, because a clean-looking account feeding a flagged one is the
> interesting case.
>
> Weight now reads "amount, not used yet". Round 3 it said "amount: numbers, not used" and I read
> it three times. "Not used yet" I get on the first pass: the column's there, the path isn't
> using it.

### 10. The reverse direction

> Swapped: From 233575, To 271813. "No directed path; one exists ignoring direction" and an
> "Ignore direction" button. Good. So the money only goes one way: 271813 toward 233575. That's
> half my answer already, in one sentence. I would not press Ignore direction; I'd write down
> "no path in that direction" as a finding.

### 11. The found path

> "Found path (unweighted)", 3 hops. Canvas: start at ACC-271813, through ACC-946224, through
> ACC-242954, end at ACC-233575, arrows on the edges.
>
> Created from: Query "Shortest path", Scope "Full graph, 3,000", Weight "amount, not used yet",
> "Paths ignore amount: hops were counted, not dollars.", Direction "follows transfers",
> Ties "1 of 2 as short". Endpoints: start ACC-271813 "outside filter". Members with riskScore:
> 1, 93, 92, 98.
>
> Edges table, in path order, and this time there's a time column:
>
> - 1: 271813 to 946224, Mar 4 18:23, $3,530.28
> - 2: 946224 to 242954, Mar 7 13:27, $9,782.05
> - 3: 242954 to 233575, Mar 8 20:29, $9,616.72
>
> Times go forward. So it's a real sequence, not just three edges that happen to line up. That's
> the answer to the task: a low-risk business account paid a flagged account, which paid another
> flagged account, which paid the top-risk account, over four days, amounts rising from 3.5k to
> just under 10k. Two of those intermediates are flagged. That's a case I could write up.
>
> Cross-check: ACC-242954 showed up as a direct neighbour of 233575 back on the find-and-expand
> screen, flagged, riskScore 92. Same here. The two screens agree, which matters more to me than
> any single number.
>
> Complaints. "Ties: 1 of 2 as short" -- where's the other one? There's no arrow, no "next", and
> the table only has three rows. In round 3 a different table showed both paths together with an
> "on paths" column; that's what I want here. The other chain could go through an unflagged
> account and that changes the story.
>
> And I'd like the tool to say "hops are in time order" rather than me eyeballing dates. If a hop
> went backwards it isn't a flow, it's coincidence, and that should be flagged, not left for me
> to spot at 2 a.m.
>
> The "UTC" in the time header -- good, named once.
>
> Is this March only? The file is "March transfers" and the amounts header says "$5.00 to
> $9,895.21", but nothing on the path panel says "time range: Mar 1 to Mar 31". I'd assume the
> whole file. I'd rather it said so, because the first question my lead asks is "what window".

### 12. What amount means

> Clicked the Weight row. Popover: "Weight: amount. In this run, a bigger amount means: a closer or
> stronger link. Distance = 1 / amount. The path prefers big transfers." And one button, Re-run.
>
> That's better than round 3. Then I didn't know whether it re-ran or quietly changed other
> results. Now it says "in this run" and there's one verb. "Distance = 1 / amount" -- I'd have
> got that backwards in networkx, it treats weight as cost. Here it's in words. For
> follow-the-money I'd take it.
>
> I didn't see the weighted result, so I can't tell you whether the path changes. I'd expect the
> header to go from "(unweighted)" to something else.

### Getting it out

> The table has the three-dot menu top right. Last time that's where "Export table as CSV..."
> lived. I'd assume it's still there; I didn't see it on these screens. Bookmark icon on the
> found path is "Keep path", and focus is sitting on it. I'd keep it.

---

## Answer to the task

ACC-271813 connects to ACC-233575 in three hops, following the direction of the transfers:
ACC-271813 to ACC-946224 (Mar 4, $3,530.28), to ACC-242954 (Mar 7, $9,782.05), to ACC-233575
(Mar 8, $9,616.72). Both intermediates are flagged. There is no path the other way. A second path
of the same length exists; I could not see it.

## Single Ease Question

**5 out of 7.**

> Once I had the path bar, it was a 6. Honest errors, direction handled, times in the table,
> the weight explained in plain words. But the screens I started on don't have the verb. On the
> find-and-expand screens the node panel offers Neighbors and nothing about paths, and the path
> icon on the toolbar has no label there. I spent a couple of minutes growing a neighbourhood and
> scanning it by eye for an ID, which is the exact thing I wanted the tool to do for me. Then the
> tie I can't open. Up from round 3 because the dates are in the path table now and the weight
> wording finally makes sense.

## Would I use this instead of my current tool?

> Not instead. Next to it. For "how is A connected to B" I'd otherwise write a Cypher
> shortestPath in BloodHound's console, or a self-join in the notebook that gets ugly past two
> hops. This gave me the chain, the direction check and the dates in about the time it takes to
> write the query, and the filter-steps list is a better record than most people's notebooks.
> But it has to get on the approved list first, it has to show me both tied paths, and it has
> to state the time window on the result. If those land, I'd use it for pivoting and keep Splunk
> and the notebook for everything else.

---

## Problems observed

1. **No path verb on the find-and-expand screens.** With one transactions node selected, the
   inspector header shows Neighbors, filter, pin and a menu, but not the "Path to..." button the
   protein inspector shows. The toolbar's path icon has no tooltip on those screens. She grew a
   neighbourhood and scanned 34 accounts by eye before finding the path bar on another page.
   Severity 3.
2. **"Ties: 1 of 2 as short" with no way to see the other path.** The found-path panel names a
   tie, but offers no stepper, and the Edges table lists only the three edges of the path shown.
   Severity 3.
3. **Hop counts in the Neighbors menu do not match the Connections table.** "1 hop 9 nodes" beside
   "Neighbors 8"; "In: paid by 9 nodes" beside "In 3". She guessed the seed is counted and the
   direction rows follow the ticked hop count, but neither is said. Severity 2.
4. **The found path does not state its time window**, and does not say whether the hops are in
   time order; she checked the dates herself. Severity 2.
5. **The inspector page with 7,495 selected was unrelated to the question**, counted nodes and
   edges together without saying so, and titled the project "Transfers, March 2026" where the
   other pages said "March transfers". Severity 1.
6. **Search shows a single ID** on the find-and-expand screens; that it takes a pasted list is
   only in the Find tooltip on another page. Severity 1.

## What worked

- The merchant warning in the Neighbors menu: "975 is a third of the graph. Two hops pass through
  merchants: ACC-393859 alone has 907 counterparties."
- "Left out by ACC-233575 and neighbors. Not drawn; not in any count." with a one-click "Add
  selection to step".
- The filter-steps list as a record of what she did.
- "From is outside the filtered graph. Set Scope to Full graph to search it." and "No directed
  path; one exists ignoring direction".
- The time (UTC) column in the found path's Edges table.
- "amount, not used yet" and "In this run, a bigger amount means ... Distance = 1 / amount".
