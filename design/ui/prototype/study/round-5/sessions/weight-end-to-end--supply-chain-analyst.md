# Cheapest route and most central accounts -- Dana, supply chain risk analyst

**Participant:** Dana Okafor, supply chain risk analyst at an industrial equipment maker. Lives in
Excel and Power BI; has tried Gephi and a Power BI network visual and dropped both. Not a network
scientist; says "centrality" for any importance score and "chokepoint" for betweenness. Mild
presbyopia; small grey labels are a real problem for her.

**Task as given by the moderator:** "The transfers have an amount on each one. Find the cheapest
route between two accounts and the most central accounts, and tell me what each answer used."

**Screens seen:** the file-open dialog for the March transfers file; the path tool on the March
transfers (path form, unweighted result, the "what amount means" popover, the reversed-direction
message); the bottom table's Edges tab with both routes; the flow page for sets and paths (its
"what the path length counted" table); the Run a measure menu and the quick search; a finished
Betweenness run; the weight question asked at a run (on the protein network); the ranked node
table.

Renders the participant looked at:
- `../../../shots/r4-dana-wete-load-step.png`
- `../../../shots/r4-dana-wete-sets-and-paths-s3.png`
- `../../../shots/r4-dana-wete-sets-and-paths-s4.png`
- `../../../shots/r4-dana-wete-sets-and-paths-s5.png`
- `../../../shots/r4-dana-wete-sets-and-paths-s6.png`
- `../../../shots/r4-dana-wete-table-dock-edges.png`
- `../../../shots/r4-dana-wete-binding-step-weight.png` (the list of four answers)
- `../../../shots/r4-dana-wete-option-form-cost-weight-refused.png`
- `../../../shots/r4-dana-wete-option-form-cost-weight-meaning.png`
- `../../../shots/r4-dana-wete-run-and-read-quick.png`
- `../../../shots/r4-dana-wete-run-and-read-catalog.png`
- `../../../shots/r4-dana-wete-run-and-read-done.png`
- `../../../shots/r4-dana-wete-results-panel-finished.png`
- `../../../shots/r4-dana-wete-results-panel-in-the-table.png`
- `../../../shots/r4-dana-wete-table-dock-ranked.png`

## Think-aloud

**Before starting.** "Transfers between accounts. That's a bank's data, not mine, but fine -- I'll
read 'account' as 'site' and 'amount' as 'freight cost'. Cheapest route I understand: it's
lane costing. Point A to point B, which way costs least. 'Most central' -- I'll assume that means
chokepoint. And 'what each answer used' -- that's the question my VP asks. 'Where did this number
come from.' So that's the bit I actually care about."

**Opening the file.** *The dialog: Format, Each row is, Ends, Direction, a column list, a sample.*
"OK, it found from_account and to_account on its own and put an arrow between them. Good.
amount -- 'Currency (USD)'. It worked out it's money. I like that, the ERP export never says
what currency anything is." *Reads the bottom right.* "'Weight: amount, not used yet.' Not used
yet? I don't know what 'weight' is here. In my world weight is kilos. Not used yet by what? There's
a 'Role' box next to amount that says None. Let me see what else it could be --" *Moderator:
the Role list has no weight or cost option.* "So I can't tell it now that amount is a cost. Fine,
it'll ask me later, I suppose. Or it won't, and I'll never know. Load."

"Three thousand accounts, nine thousand transfers. That's my supplier count ballpark. OK."

**Finding the route.** *Looks for something that says route or path. Sees the toolbar icon with
two squiggles and hovers.* "That's the path one, I'm guessing, it looks like a road." *The form:
From, To, Scope, Weight.* "From and To. I'll put in the two accounts. Scope says 'Filtered graph'
with a yellow warning and 'From is outside the filtered graph. Set Scope to Full graph to search
it.' I didn't filter anything -- oh, somebody filtered earlier, fine. Full graph." *Looks at the
Weight box.* "'amount, not used yet' again. Is that a dropdown? It has an arrow. I'm going to
leave it. I'll press Run and see what it gives me, that's how I learn a tool."

*The unweighted result.* "Right. A line on the map, start and end tags, three steps. The table at
the bottom has the three transfers with amounts -- $3,530.28, $9,782.05, $9,616.72. So that's
the route. Cheapest route --" *Stops at the right-hand panel.* "'Found path (unweighted).'
'Paths ignore amount: hops were counted, not dollars.' Oh. OK. That's honest. So this is the
route with the fewest transfers, not the cheapest. Good that it says it, in plain English -- 'not
dollars', I understand 'not dollars'. If it hadn't said that I would have taken this to the
meeting. I'd have added up those three and called it the cheapest."

"'Ties: 1 of 2 as short.' So there's another route with the same number of steps and it picked
one. Which one did it pick and why? It doesn't say why."

*The Edges tab in the bottom table, with both routes and an 'on paths' column.* "Oh, here it
shows both routes. Five transfers, '1 of 2', '2 of 2'. I can do this myself." *Adds on her
fingers, then says she would paste into Excel.* "Via 242954: 3,530 plus 9,782 plus 9,617, call it
22,929. Via 670564: 3,530 plus 9,468 plus 9,399 -- 22,398. So the other one is cheaper, by about
five hundred and thirty dollars, and the tool drew the dearer one. Honestly? I just found the
cheapest route with a calculator. That's the pivot table test and the tool lost it."

**Making it use the amount.** "Right, so how do I tell it to count dollars." *Clicks the Weight
row in the right-hand panel; the popover opens.* "'amount: what it means.' 'For amount, a higher
number means' -- and it's already filled in: 'a closer or stronger link'. Then: 'A path prefers
big transfers.' No! I want the cheap one. Why would a path prefer big money? Who filled that in?
Did I? I didn't touch it." *Opens the list.* "'a closer or stronger link -- similarity', 'a longer
or costlier step -- distance', 'more can pass through -- capacity', 'Don't use amount'. OK,
'costlier'. That's my word. A higher amount is a costlier step. That one."

"'Applies to every result that reads amount.' Hm. I skimmed that. Every result. Fine for now,
I'm only doing a route."

*The moderator describes what the run then shows, from the flow page: 'Found path, 3 hops,
distance $22,397.82'; 'Weight: amount, used as distance'.* "OK, 22,397.82 -- same as my
calculator, good, now I trust it a bit. And it went via 670564, the cheap one. But 'distance'?
It's not a distance, it's dollars. Call it 'total' or 'cost'. My VP reads 'distance $22,397' and
asks me if we're shipping by the mile."

*On the weight question as it appears on another screen (protein network), the refusal message:
"Can't weight paths by confidence: confidence isn't set up as a length yet."* "'Set up as a
length.' I don't know what that means. A length of what? If that's what I'd see for amount, I'd
have gone back to Excel. The button 'Set up confidence' at least tells me where to click. The
next screen asks the question with nothing ticked -- that's better than the popover, which had an
answer already in it that was the wrong one for me."

*The flow page's table of the four answers.* "Wait -- 'a longer or costlier step (distance) (the
wrong reading here)'. 'Treating money as a cost makes the strongest ties the longest: the
failure the question guards against.' Wrong for whom? The question was cheapest route. Cheapest
means money is a cost. For fraud people maybe big transfers mean a strong tie, but I'm costing a
lane. Whoever wrote that has already decided what my data means. That's exactly what I don't
want a tool to do."

**Reversing the route.** *The reversed search: "No directed path; one exists ignoring direction",
with 'Ignore direction'.* "That's clear. Money only goes one way, fine. I would NOT press Ignore
direction -- a truck doesn't drive backwards up a one-way lane. But good that it tells me rather
than quietly doing it."

**Most central accounts.** "Now 'central'. Where's that." *Types 'centr' into the search box.*
"'Catalog: Centrality' -- Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz,
PageRank. Seven. I know one of those words. Betweenness is chokepoint, the vendor webinar said so.
The rest I wouldn't click. 'Closeness' has 'WF-corrected' next to it -- corrected for what?
'Eigenvector' has a warning, '3 components'. No idea. Betweenness."

*Moderator: the run screens on hand show the protein network.* "Well, these are proteins, not my
accounts. MAPK1, TP53. I'll have to take your word that it looks the same on transfers. That
bothers me -- I can't see what it would say about MY accounts, and that's the whole point."

*The run panel.* "'on: full graph, 300 nodes, 3 components.' 'Exact. Unweighted, undirected.'
Undirected. So for this one it ignores which way the money goes? For the route it followed the
money and wouldn't reverse. For the central ones it doesn't care? That's two different answers
from the same data and nobody asked me." *Hovers 'Exact'.* "'Computed on every node, not
estimated. It does not say the ranking is meaningful.' Ha. Well, at least it's honest. Then what
does say it's meaningful? Me, I suppose."

"'Weight: None for this run.' And up top: 'Weight: confidence, not used yet. Change...'. So on
my transfers that would say 'amount, used as distance', because I told it amount is a cost for
the route. 'Applies to every result that reads amount.' Hang on." *Thinks.* "If amount is a cost,
then an account that pushes big money through it counts as far away. For 'most central' I want
the opposite -- the account the big money flows through is the one I care about. That's my
chokepoint. So for the route I want amount as a cost and for the chokepoints I want amount as
volume. And it keeps one answer for the whole column. If I press 'Change...' to fix the
chokepoints, does my cheapest route change behind my back? The panel says 'None for this run',
so maybe this run doesn't use it at all -- then which is it, 'every result' or 'for this run'? I
genuinely can't tell which of those two sentences wins."

"So what did the central answer use? From what's on screen: nothing. Every transfer counted the
same, direction ignored, all accounts. Which means a $5 transfer and a $9,800 transfer count
equally. For money, that's not 'central', that's 'busy'. I'd report it with that caveat or not
at all."

**Reading the ranking in the table.** *The node table with rankings.* "Now this I like. Tables I
can read. Over each block of columns it says what ran: 'Betweenness exact, unweighted, full
graph'. 'PageRank damping 0.85, unweighted, full graph'. That's the 'what did it use' answer,
right there on the column. If that header comes out in the export, it's my footnote on the
slide." *Squints.* "The grey under 'degree (full graph)', '0 to 34', the little bar charts --
too small, I can't read those without my glasses." *Reads across.* "'Louvain weighted, seed 7.'
Weighted by what? The panel says the only number column is 'not used yet'. So which is it? That
one line makes me doubt the other two."

"And the line above the table: 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they
part.' That's useful. That's the sentence I'd put on the slide -- if two different methods agree,
I believe it more."

**Summing up, as asked.** "Cheapest route: via 670564, $22,397.82 total, used amount as a cost,
followed the direction of the money, whole graph. But only after I said 'costlier step' -- the
first thing it gave me was the fewest-transfers route, and the popover had 'stronger link'
filled in, which would have given me the most expensive one. Most central: MAPK1 and TP53 on the
proteins -- I didn't see my accounts -- and it used nothing: no amounts, no direction."

## Single Ease Question

**3 out of 7.** "The route was fine once I knew to tell it amount is a cost, and it told me
itself that it hadn't counted dollars, which is the only reason I didn't walk out with the wrong
route. But I had to fix a pre-filled answer that was backwards for me, the word 'distance' is
wrong for money, and on the central accounts I couldn't tell whether my answer about amount was
being used or not. And I never saw my own accounts ranked."

## Would she use it instead of her current tool?

"No. Not instead. For the route, Excel with a pivot of both routes got there as fast, and I
trust my sum. The bit I'd actually want is that column header -- 'exact, unweighted, full graph'
-- and 'hops were counted, not dollars'. Nothing I use today tells me what a number was computed
with. If those lines come out with the table into Power BI, it's a side tool I'd open when
someone asks 'where did this come from'. But it has to let me say amount means cost for one
question and volume for another, and it can't decide for me that cost is the 'wrong reading'.
And IT still has to sign off before any supplier list goes near it."

## Observer notes

- The unweighted result's line "Paths ignore amount: hops were counted, not dollars." worked:
  she read it, understood it, and it stopped her reporting the fewest-hops route as the cheapest.
  She named it as one of two things she would keep.
- The unweighted run picked the dearer of two tied routes ($22,929.05 via ACC-242954 over
  $22,397.82 via ACC-670564) with no reason given for the pick. She found the cheaper route by
  adding the Edges tab amounts by hand before the tool did.
- The "what it means" popover opened from the result's Weight row shows "a closer or stronger
  link" already in the field and "A path prefers big transfers." She read it as an answer
  someone had chosen for her, and it was the opposite of "cheapest". The same question asked at a
  run shows four radio buttons with none chosen; she preferred that.
- She chose "a longer or costlier step" because "costlier" was her own word. The resulting label
  "distance $22,397.82" confused her: for money she expected "total" or "cost".
- "isn't set up as a length yet" meant nothing to her.
- The flow page labels "a longer or costlier step" as "the wrong reading here". For her task
  (cheapest route) it was the right reading, and she objected to the tool presuming what her data
  means.
- The central conflict of the session: one answer per column ("Applies to every result that reads
  amount") cannot serve both her questions. For the route she wanted amount as a cost; for "most
  central" she wanted big transfers to count more, not less. She could not tell whether changing
  it for centrality would silently change her route, and "Weight: None for this run" beside
  "Weight: ... Change..." on the same result left her unsure which statement governs.
- Betweenness ran "undirected" while the path tool followed the money one way. She noticed the
  mismatch and did not know why the two answers treat direction differently.
- Every centrality screen shows the protein network, not the transfers, so she could not see or
  judge a ranking of accounts; she answered the centrality half by analogy.
- The table column-group headers ("Betweenness exact, unweighted, full graph") were the best
  answer to "what did each answer use" in the session. "Louvain weighted, seed 7" names no column
  and contradicts "not used yet" in the panel; one such line lowered her trust in the rest.
- Small grey sub-labels in the table header (ranges, mini charts) were hard for her to read.
