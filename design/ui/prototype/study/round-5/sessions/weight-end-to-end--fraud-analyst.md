# Session: amounts, cheapest route and central accounts -- fraud analyst (Sarah)

Participant: Sarah, level-2 financial crime investigator (study/personas/fraud-analyst.md).
Mode: not stated by the moderator. Played as a moderated first impression: she works the task
because she was asked to, and says plainly where she would have stopped on her own.

Task as given: "The transfers have an amount on each one. Find the cheapest route between two
accounts and the most central accounts, and tell me what each answer used."

Material worked from, as the participant sees it (study view, 1440 x 900):

- the load step on the March transfer file, and the protein file after loading, for the
  Statistics weight line (shots/screens__load-step--study.png,
  shots/screens__load-step-loaded--study.png)
- the recipe binding step (shots/screens__binding-step--study.png)
- the path tool on March transfers: the form, the found path, the "what amount means" popover,
  no directed path, the frozen copy (shots/r4-sarah-we2e-sp-s3.png, -s4, -s5, -s6, -s7)
- the table dock on the transfers with PageRank and Degree ranked, and the rows out of the path
  (shots/r4-sarah-we2e-td-large.png, -td-out; -td-ranked rendered but not needed)
- the run-and-read and results-panel pages for how a centrality run reads when done
  (shots/screens__run-and-read.png, shots/screens__results-panel--finished.png)

Page HTML was read only to see what a control does when clicked: the options behind the
"a higher number means" list, and what the path does with each answer.

## Think-aloud

**1. Opening the file.** (load-step)

"transfers-2026-03.csv. Good, that's a statement-shaped file: from, to, amount, timestamp. It
read the amount as currency, USD, and the timestamp as a date, Mar 1 to Mar 31, UTC. I didn't
have to strip anything. That alone beats the i2 import wizard.

"Role column. from is source, to is target, timestamp is 'Time role', amount is 'None'. None?
It's the most important column in the file. Down at the bottom: 'Weight: amount, not used yet.'
Yet. OK, so it knows it's a number and it's parking it. I don't love 'None' next to my money,
but it hasn't thrown it away -- it's in the sample. 3,000 accounts, 9,113 transfers. Load."

**2. After loading, is my amount there?** (load-step-loaded, which is a different dataset, so I
read only the right-hand side)

"This is some protein thing, not my transfers, but the panel on the right says 'Weight:
confidence, not used yet. Change...'. So on mine it'll say amount, not used yet. There's a
Change link. I'm not clicking a settings link before I know what it changes. Moving on."

**3. The recipe screen.** (binding-step)

"Genes, fold change, 'Expression overlay', 'a closer or stronger link'. This isn't mine. I skip
it. If the moderator wanted me here, I'd have missed it."

**4. The route. Where do I start?** (sets-and-paths s3)

"March transfers. There's a toolbar at the bottom, the second icon looks like a route. From,
To, Scope, Weight, Run. That's what I want. From ACC-271813, To ACC-233575 -- the one with
riskScore 98, fine, I'll use that.

"Red warning: 'From is outside the filtered graph. Set Scope to Full graph to search it.' Good.
It told me before it ran instead of quietly giving me nothing. I'd have been on a filter
without knowing it. Scope to Full graph.

"Weight: 'amount, not used yet'. I leave it. I want to see what it does first."

**5. The first answer.** (s4)

"'Found path (unweighted), 3 hops.' And right under it on the right: 'Paths ignore amount:
hops were counted, not dollars.' Thank you. That's the first sentence in this study that I'd
paste into a narrative as is. So this is the shortest route in transfers, not the cheapest.

"Table at the bottom: three transfers in path order, $3,530.28, $9,782.05, $9,616.72. Nine and
a half thousand, nine and a half thousand -- that's just under ten, that's structuring-shaped,
I'd note that anyway.

"'Ties: 1 of 2 as short.' There's a second route of the same length and it drew one. Which one
did it pick and why? Where's the other one? If I show my reviewer route A and there's a route B
with the same hop count, the first question is 'why A'."

**6. Getting both routes out.** (table-dock out, the edges part)

"Here: 'Selected: 5 edges on 2 paths.' Both routes as rows, with hop, date and amount, and an
'on paths' column. That's what I actually wanted. I'll do the cheapest myself:

- through ACC-242954: 3,530.28 + 9,782.05 + 9,616.72 = $22,929.05
- through ACC-670564: 3,530.28 + 9,468.23 + 9,399.31 = $22,397.82

"The one through ACC-670564 moved less money. That's what 'cheapest' means to me: the total
dollars on the route. And the dates run forward, Mar 4, Mar 7, Mar 8 or 9 -- money moving in
order, so it's a real chain, not a coincidence. That's a pivot-table job and I just did it in
my head from five rows, but fine, the rows were there and I can export them."

**7. Can the tool do the cheapest itself?** (s5)

"I click the Weight row on the result. A box: 'amount: what it means. Applies to every result
that reads amount. For amount, a higher number means [a closer or stronger link]. A path
prefers big transfers.'

"No. I asked for the cheapest. 'Prefers big transfers' is the opposite of cheapest. And it's
pre-picked. If I'd just hit OK I'd have the most expensive route and a line saying 'used as
similarity', which I would not have understood as 'the most expensive'.

"What else is in the list?" (from the page source: a closer or stronger link / a longer or
costlier step / more can pass through / Don't use amount)

"'A longer or costlier step.' Costlier. That's the word. Cheapest route, costlier step -- the
bigger the amount the more the step costs, so it picks the small ones. I pick that one."

(From the page source: with that answer the result reads "Found path, 3 hops, distance
$22,397.82" and "Weight: amount, used as distance", through ACC-670564.)

"$22,397.82. That's my number from step 6, to the cent. Good -- it agrees with me, and it
shows it in dollars, not in some unit. But it calls it 'distance'. A distance of twenty-two
thousand dollars. My reviewer will read that and ask what a dollar distance is. I'd write
'total moved along the route' in the SAR and not copy their word.

"'How it is converted' -- I open it on the other choice and it says something like 0.000489 per
dollar. I close it. I will never quote that."

**8. The catch: 'applies to every result that reads amount'.** (s5, re-read)

"Wait. It says it applies to every result. So now amount means 'costly' everywhere in this
case. The next thing I'm asked is the central accounts. If amount means costly, then the
accounts that moved the most money look far away from everything. That's backwards for a hub.
The account everything touches with big money is exactly the one I want at the top.

"So I have one switch for two questions that want it the opposite way round. For the route I
want small dollars to be close; for the hub I want big dollars to count for more. Either I flip
it back and forth -- and then which one did the earlier answer use? -- or I leave the hubs
unweighted."

**9. No route the other way.** (s6)

"Tried it backwards, 233575 to 271813: 'No directed path; one exists ignoring direction.'
Clear. I'd not press Ignore direction on money -- money doesn't flow backwards. Fine."

**10. Keeping the route.** (s4 bookmark, s7)

"There's a Keep path button. And the frozen sets list with 'Frozen on Sep 28 2026' and where
it came from. That's my audit trail. I'd want the kept path to say what weight it was found
with, not just '3 hops' -- the Created from block on the result does show Query, Scope, Weight,
Direction, Ties. If that travels with the kept copy, fine."

**11. The central accounts.** (table-dock large, run-and-read catalog)

"Where do I get 'central'? The lightning bolt, I guess. A list: Betweenness, Closeness,
Eigenvector, Harmonic centrality, HITS, Katz, PageRank. I don't use any of these words.
Hovering Betweenness: 'How often a node lies on the shortest paths.' Shortest paths -- in
transfers? In dollars? It doesn't say here.

"The table already has two done on my transfers: Degree, and 'PageRank damping 0.85,
unweighted, full graph'. Unweighted -- so it's in the column header. Good, that's the one thing
I'd need before quoting it. 'The top 10 are the same on both measures, led by ACC-393859.' That
line I like. Two different counts agree on who's in the middle.

"Degree: 'total, full graph, 1 to 907'. 907 counterparties on one account -- that's a payroll
or a processor, not a mule. Top of the list and probably benign. I'd have to rule it out in
writing.

"But none of this is money. 'Unweighted' on both. The hub I care about is 'received from 47
accounts, $380k in, $375k out the same week'. I don't see a money-in and money-out total per
account anywhere. That's a pivot table. That's what I'd actually do: export the edges, pivot by
to_account, sum amount.

"Could I weight PageRank by amount? The result panel has 'Weight: ... not used yet. Change...'
-- the same question as the path. And I just told it amount is costly. So a weighted run now
reads big transfers as weak links. I don't trust myself to get that right, and I'd have to
explain it to an examiner. I leave the centrality unweighted and say so."

**12. What each answer used, as I'd write it.**

- Route: "Shortest route by number of transfers: 3 hops, 2 equal routes. Cheapest of the two by
  total dollars: ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, $22,397.82, Mar 4 to 9.
  Found with amount used as a cost (the tool calls it distance), full graph, following transfer
  direction."
- Central accounts: "PageRank, damping 0.85, and degree, both unweighted -- they count
  transfers and counterparties, not dollars. Full graph, 3,000 accounts. Top 10 agree, led by
  ACC-393859."

"The route answer I could defend. The hub answer is honest but it's not about money, and that's
the question my manager actually meant."

**13. Out.** (table-dock out, export)

"Export table as CSV, with the method in the column header -- 'pagerank (damping 0.85,
unweighted, full graph)'. That's good, that survives into Excel. And the path's five rows with
amounts and dates. That's evidence I can file."

## Single Ease Question

3 of 7. "The route was easy until I wanted it cheapest. Then the tool's first guess was the
opposite of what I asked, and the one setting for amount is shared by the route and the hubs,
which want it opposite ways. The central-accounts part never touched money at all."

## Would she use this instead of her current tool?

"No, not instead. Alongside, for the few cases with many linked accounts. For a route between
two accounts with the dates and dollars on each hop and both equal routes as rows, it's faster
than i2 and the import was painless. For 'who's the hub', I'd still export and pivot in Excel,
because what I need is money in and money out per account, and nothing here gave me that. And
I'd have to get it approved before it sees real customer data, which isn't my call."

## Workarounds she used

- Summed the two equal-length routes by hand from the rows to find the cheapest before trusting
  the tool's weighted answer.
- Ignored the tool's word "distance" and rewrote it as "total moved along the route".
- Left centrality unweighted because the one meaning of amount she had set for the route would
  have turned big transfers into weak links for the hubs.
- Planned to export edges and pivot by account in Excel for money in and out totals.

## What the studio should take from this

- "Cheapest" maps to "a longer or costlier step" in her head, which is the reading the flow
  page labels the wrong one. For a question about cost, it is the right one. The preselected
  "a closer or stronger link ... A path prefers big transfers" would have given her the most
  expensive route with a line she would not have decoded.
- One meaning per column, "applies to every result that reads amount", collides with her task:
  the route wants money as cost, the hubs want money as strength. She saw the conflict herself
  and resolved it by not weighting the hubs.
- The unweighted labels worked: "Paths ignore amount: hops were counted, not dollars" and
  "unweighted" in the PageRank header both told her what each answer used without a click.
- The found-path screen draws one of two equal routes ("1 of 2 as short"); the rows view shows
  both. She needed both before trusting any cheapest answer.
- Her notion of "central" is dollars in and out per account, which the flow page lists as
  proposed with no screen yet. Without it the centrality answer is not about money.
- "distance $22,397.82" matched her own sum, which built trust; the word "distance" did not.
