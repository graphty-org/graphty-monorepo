# Session: this month's file into last month's project, and why the groups changed -- knowledge engineer (Min-ji)

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
She owns ontologies, not fraud cases; for this task she played a data architect who has been
handed a colleague's transfers project to refresh, which is close to her monthly source-system
refresh work. The data is two CSVs (accounts, transfers), not RDF, so her "not for RDF" check
does not apply; she judged the tool on the refresh and on whether its numbers hold up.

Task as given: "Last month's transfers project needs this month's file. Update it, and explain
why the number of groups changed."

Material worked from (participant view, design notes hidden): the storyboard for the weekly
return, the step-by-step weekly-return screen (start screen through the March-against-April
comparison), Data > Versions with What changed and a past version open
(screens/version-history.html), the Replace data dialog and binding step on another project
(screens/replace-and-recipe.html), the Data panel before an update (screens/data-panel.html),
the replace-and-recipe flow chart, and the PageRank comparison page. HTML was read only to see
what a control would do.

Renders: shots/record/r4-minji-wu2-storyboards_weekly-return.png, shots/record/r4-minji-wu2-screens_weekly-return.png,
shots/record/r4-minji-wu2-screens_version-history.png, shots/record/r4-minji-wu2-vh-s2.png,
shots/record/r4-minji-wu2-screens_replace-and-recipe.png, shots/record/r4-minji-wu2-flows_replace-and-recipe.png,
shots/record/r4-minji-wu2-screens_data-panel.png, shots/record/r4-minji-wu2-screens_comparison.png.

## Think-aloud

**1. Start screen.**

"Recent projects. 'Case 0314, mule ring -- Transfers, 3,000 accounts. Edited Apr 3.' Fine,
that is the one. Three thumbnails of hairballs; I will not read anything into them. Open it."

**2. The project reopens.**

"It restored a selection of 14 nodes and tells me so, with Clear. Good; I hate tools that
silently keep or silently drop state. Legend: 'Community color, Louvain community', seven named
communities and 'Other, 28 communities, 1,851'. So 35 communities in March. Let me check the
legend sums before I trust anything: 297 + 182 + 147 + 141 + 139 + 123 + 120 is 1,149, plus
1,851 is 3,000. Matches the 3,000 accounts. Statistics: 3,000 accounts, 9,113 transfers,
components '1, weakly'. And 'Last import: March data, accounts-2026-03.csv,
transfers-2026-03.csv, Apr 3'. Good: it tells me which files the current state came from.
That is provenance, the thing most viewers never give me."

**3. Finding the update.**

"The words I would look for are 'update' or 'refresh'. Hamburger menu, File. 'Replace data...
New files under this analysis; March kept as a version. 1 slow result will wait for Re-run.'
And under it 'Add data... More rows on top of the data loaded now.' Those two are clearly
different operations and the menu says which is which. Replace is what I want: April is a
snapshot, not a delta. I appreciate that it tells me in the menu that March is kept. In my world
that is the difference between DROP GRAPH and a new named graph."

"On the other project's Data panel, the same thing is called 'Update with new data...'. Two
names for one operation. I would not have noticed if I only used one entry point, but I read
both, and I stopped to check whether they were different. They are not, as far as I can tell."

**4. File picker.**

"Two April files, 3,093 rows and 8,370 rows, dated today. 'The files are read on this
computer; nothing is sent.' I read that line every time; confidential data. Select both, Open."

**5. The other door, out of curiosity: Add data.**

"If I had picked Add data it would have warned me: same columns as March, so this looks like a
replacement, and it tells me the merged result -- 3,132 accounts, 17,483 transfers -- versus
replacing -- 3,093 and 8,370. I checked: 3,000 + 132 = 3,132 and 9,113 + 8,370 = 17,483. The
numbers add up. This is the warning I wish GraphDB gave me when someone loads a full dump into
the wrong named graph. Credit where due."

**6. The load step.**

"Files: accounts as nodes, 5 of 5 columns matched, id is the key; transfers as edges, 4 of 4,
from_account is source, to_account is target. 'Every column has the name it had in March, so no
binding step opens.' Good -- it tells me why it is not asking me."

"Counts against March. Accounts 3,093 vs 3,000. Found by id 2,961, new 132, not in April 39.
2,961 + 132 = 3,093; 3,000 - 39 = 2,961. Consistent. 'With no transfers: 26 in April, 0 in
March.' And the issue: '26 accounts have no transfers in April. All 26 were in March; none is
new. Each will be a component of its own.' Right. This is the sentence that will explain my
group count, and it is telling me before I commit. That is the right time."

"'Same pair as March: 7,576.' Pairs of what? Distinct account pairs, or transfer rows whose
pair also appeared in March? It sits in a column next to 'transfers 8,370', which is a row
count, so the table is mixing a pair count with a row count. I want the unit named."

"'What replays: Degree; Louvain with its 5 seeded re-runs -- seconds. Modularity vs randomized
baseline -- a few minutes: waits. 2 style layers, the layout, 1 set, 1 note -- carried over.'
So it will not silently rerun the expensive thing. Fine. Load."

**7. After the load: the replay report.**

"Version history opens on the right: April data today 09:14, March data Apr 3. Replay report.
Accounts: found by id 2,961 of 3,000, new 132, not in April 39 with List, no transfers 26 with
Select. 'Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no
transfers.' 3,067 + 26 = 3,093. Good. 'Components: 1 to 27' reads like a range, not 'from 1 to
27'. I read it twice."

"Results: '2 replayed. Louvain, with its 5 seeded re-runs: 65 communities, was 35. 39 have
transfers; 26 are single accounts with none.' There it is. So of 65, 26 are singletons -- an
isolated node is trivially its own community in Louvain; that is not a finding, it is a
property of the algorithm. Take them out and it is 39 against 35."

"Then under Style layers: 'Community color: 26 communities keep their March name and color by
overlap; 39 are new, 26 of them single accounts.' Now wait. 26 matched, 39 new. Earlier it was
39 with transfers, 26 singletons. And 39 accounts not in April, and 26 accounts with no
transfers. The same two numbers, 26 and 39, mean four or five different things on one panel.
I had to do the algebra myself: 65 = 26 matched + 39 new; the 26 singletons are all in the new
39; so 13 genuinely new communities with transfers. And 35 March communities minus 26 matched
means 9 March communities matched nothing in April. Where did those 9 go? Split? Absorbed into
Community 1, which grew by 62? Nothing on this panel says. The numbers are not wrong -- I
checked them -- but the explanation is mine, not the tool's."

"Also, the left panel still says 'Transfers, 3,000 accounts' after the load, while Statistics
says 3,093. It stays 3,000 through the Re-run and into the comparison, and only on Wednesday's
screen does it read 3,093. The same happens on the other project: 'March, 3,000' in the left
panel with April loaded. That is exactly the kind of mismatch that makes me stop trusting every
other number. One stale count and I start re-deriving everything by hand, which I just did."

"Legend now: seven named communities and 'Other, 58 communities, 2,070'. 359 + 168 + 127 + 126
+ 111 + 74 + 58 = 1,023, plus 2,070 = 3,093. OK. But the 26 singletons are hiding inside
'Other, 58'. I would want them shown separately -- 'isolated, 26' -- or excluded from the
community count by a choice I can see. Size domain 'refit to April, 0 to 842, was 1 to 907':
the 0 is the isolated accounts. Honest, at least."

**8. Re-run the waiting result.**

"Modularity vs randomized baseline, Re-run, a progress bar with Cancel, 'a few minutes'. It
says it is running and it does not freeze the page. Then 'Modularity vs randomized baseline is
current'. Fine. I did not see the April modularity value anywhere on these screens, though, and
it is the number I would put next to '39 against 35'."

**9. Data > Versions, What changed.**

"This is the view I would have gone to first if I had known it existed. April data, current.
'What changed, against March data. 27 components (was 1), large change: 26 accounts have no
transfers in this version. Select. 65 communities (was 35), large change: 26 are single
accounts with no transfers in this version.' That is the answer in two lines, with the cause
next to the count and a flag on both jumps. 3,093 accounts (was 3,000): 2,961 in both, 132 new,
39 not in April. 8,370 transfers (was 9,113): 7,576 in both, 794 new, 1,537 not in April."

"'7,576 transfers in both' -- no. A transfer is an event with a timestamp. No April transfer is
in March. What it means, I suspect, is a transfer whose account pair also appeared in March;
the load step called it 'same pair as March'. Here it has become 'in both', which a reader will
take literally. Say pairs, or say what the identity of a transfer is."

"The legend note: 'Names and colors kept from March data by overlap; 39 new communities
numbered 36 to 74.' Good, stable identifiers across versions. That is what I would do with
IRIs."

"And the past version: March opened read-only, with 'Methods, one sentence per run': Louvain
'weighted by amount, direction ignored, resolution 1, seed 11, over the full graph: 35
communities, weighted modularity 0.688. graphty-element 2.0.0, on the CPU.' With Copy methods
text. That is what I need to defend a number in a meeting. The modularity-vs-baseline sentence
says 0.688 'against 100 degree-preserving randomizations' but not the outcome -- the baseline
mean, a z-score, anything. It describes the test and omits the result."

**10. The comparison, March against April.**

"Agreement, AMI: March and April on the 2,961 in both: 0.45. Without the 26 silent in April:
0.45. Five re-runs on March agree 0.76 to 0.77 with each other; five on April 0.81 to 0.85.
'1 is the same partition, 0 is chance. Louvain is random, so runs on the same data differ too.'
This is the most useful thing on any of these screens. It tells me the month-to-month change,
0.45, is well outside run-to-run noise, 0.76 to 0.85. So the grouping really changed; it is not
just a different random seed. I would quote that. And it names AMI, not 'similarity'. Good."

"Table: 26 communities matched by overlap, 10 grew. Community 1 297 to 359, +62, 28 new
accounts. Community 33 22 to 32, holds 1.00 in April's re-runs. Tabs Grew, Shrank, New in April.
Shrank is where I would look for the 9 March communities that vanished, but I could not see
what it shows; nothing on the page says whether a community that matched nothing counts as
'shrank to zero' or is listed anywhere. 'New April communities: 39 communities, 799 accounts'
-- 26 of those are single accounts, so 13 real ones with 773 accounts. Again I did the
subtraction."

**11. Another project's Replace data.**

"Different project, 'Mule ring review'. Same April file, one CSV carrying account attributes.
3,093 nodes, 8,370 edges, 2,961 found, 132 new, 39 not in April -- same counts. After Apply:
'Weakly connected components: replayed; unchanged: 1 component' and 'Louvain communities:
replayed; 12 communities, was 11'. On the first project the same April data gave 27 components
and 65 communities, from 35. If these are the same transfers, one of them is wrong. Maybe the
second project builds accounts from the transfer list only, so an account without transfers
cannot exist and there are no singletons -- but then it should not say 3,093 nodes and 39 not in
April with the same split. Nothing on screen explains the difference. In a real session this
is my second unexplained failure and I stop."

**12. The flow chart.**

"Several empty rounded boxes in the flow page, no text. I assume notes that are hidden in this
view. The only flow on it is a proteomics recipe, not my task. Skipped."

## What she would write as the explanation

"April replaced March in the project (March is kept as a version). Louvain now reports 65
communities, against 35 in March. 26 of the 65 are single accounts: 26 accounts that had
transfers in March have none in April, so each is an isolated node and Louvain gives each its
own community. Leaving those out, there are 39 communities with transfers against 35: 26 match
a March community by overlap, 13 are new, and 9 March communities matched nothing. Agreement
between the March and April partitions on the 2,961 accounts in both months is AMI 0.45,
against 0.76 to 0.85 between re-runs on the same month, so the grouping changed beyond Louvain's
own randomness. Method: Louvain, weighted by amount, direction ignored, resolution 1, seed 11,
graphty-element 2.0.0."

"Three of those sentences the tool gave me directly. Two -- the 13 new and the 9 lost -- I had to
derive. The note would have been one copy-paste if the What changed line said '65 (was 35):
26 isolated accounts; of the other 39, 26 carried over, 13 new; 9 March communities not
matched'."

## Single Ease Question

**5 of 7.** The update itself was a 6: one menu item, a preview with counts I could verify,
a clear warning on the wrong door, and nothing ran expensively behind my back. The explanation
was a 4: the cause (26 isolated accounts) is stated before commit and again in What changed,
but I had to assemble the net figure and the lost communities by arithmetic across two panels
where 26 and 39 each meant several things, and a stale '3,000 accounts' in the left panel made
me recheck everything.

## Would she use this instead of her current tool?

"For this job -- refreshing a monthly snapshot and explaining what moved -- yes, over my
notebook. Today I would diff two named graphs with SPARQL, compute AMI in pandas and write the
methods paragraph by hand. Here the diff, the version kept, the AMI against re-run noise and the
methods sentence are all there, and nothing leaves the machine. Conditions: the left panel count
must never lag the data, 'transfers in both' must say what identity it uses, and two screens
must not give 27 components and 1 component for the same file. For my own knowledge graph,
still no -- it loads CSV, not Turtle -- but that was not today's question."

## Findings, by severity

1. The same April data gives 27 components and 65 communities (from 35) on one project and
   1 component and 12 communities (from 11) on another, with identical account counts and no
   explanation. For a participant who checks known answers this ends the session. (5)
2. The Graphs row in the left panel keeps the old count ("3,000 accounts", "March, 3,000")
   after Replace data, through the replay and the comparison, while Statistics shows 3,093.
   (4)
3. The explanation for 35 to 65 is present but split: the net change without singletons
   (39 vs 35), the 13 genuinely new communities and the 9 unmatched March communities are never
   stated; the participant derived them. The unmatched March communities are not shown anywhere
   she could find. (4)
4. The numbers 26 and 39 each carry three or more meanings in the replay report (accounts not
   in April, communities with transfers, new communities; accounts with no transfers,
   singletons, matched communities). Correct, but it forces algebra. (3)
5. "7,576 transfers in both" treats a transfer as if it had an identity across months; the load
   step calls the same number "same pair as March" and sets it beside a row count. (3)
6. Isolated accounts are counted as communities and hidden inside "Other, 58 communities" in
   the legend; she wants them shown as "isolated, 26" or excluded by a visible choice. (3)
7. The modularity-vs-baseline methods sentence describes the test but not its result, and the
   April modularity value is not visible on the replay or Results screens. (2)
8. Two names for the same operation: "Replace data..." in the File menu and "Update with new
   data..." in the Data panel. (2)
9. "Components: 1 to 27" reads as a range. (1)
10. The flow page shows empty boxes in participant view. (1)

## What worked for her

- Add data refuses to be mistaken for Replace data, and shows both outcomes' counts, which add up.
- The load step's counts against March, with the 26 no-transfer accounts named as an issue
  before commit, including the consequence ("each will be a component of its own").
- The slow run waits visibly instead of running behind her back.
- What changed on the version row: each large jump carries its cause on the next line.
- Community names kept across versions by overlap; new ones numbered after March's.
- AMI between months set against AMI between re-runs of the same month, with the scale
  explained in one line.
- The per-run methods sentence with the algorithm's parameters, seed and library version, and
  Copy methods text.
- "Nothing is sent" stated at the file picker and in the side rail.
