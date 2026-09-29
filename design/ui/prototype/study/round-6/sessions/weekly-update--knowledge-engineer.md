# Session: this month's file into last month's project, and why the groups changed -- knowledge engineer (Min-ji)

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
As in the previous round she played a data architect handed a colleague's transfers project to
refresh; the data is two CSVs (accounts, transfers), not RDF, so her "not for RDF" check does not
apply. She judged the tool on the refresh and on whether its numbers hold up. She did this task
in the previous round too (ease 5 of 7) and remembered what had bothered her.

Task as given: "Last month's transfers project needs this month's file. Update it, and explain
why the number of groups changed."

Material worked from, as a participant sees it (design notes hidden): the step-by-step weekly
return (start screen through Wednesday's export), Data > Versions with What changed, a past version
open, a restored version and the two failure states (screens/version-history.html), the Data panel
before and after an update (screens/data-panel.html), Update with new data on another project with
its binding step and replay report (screens/replace-and-recipe.html), and the comparison page
(screens/comparison.html). HTML was read only to see what a control does, and to check which
screen shows which count.

Renders, all in the participant view: shots/r6-minji-wu-weekly-return.png,
shots/r6-minji-wu-version-history.png, shots/r6-minji-wu-vh-s1.png to shots/r6-minji-wu-vh-s6.png,
shots/r6-minji-wu-data-panel.png, shots/r6-minji-wu-dp-s1.png to shots/r6-minji-wu-dp-s8.png,
shots/r6-minji-wu-replace-and-recipe.png, shots/r6-minji-wu-comparison.png.

## Think-aloud

**1. Start screen.**

"Recent projects. 'Case 0314, mule ring -- Transfers, 3,000 accounts. Edited Apr 3.' Open it.
Same as last time, which is what I want from a start screen."

**2. The project reopens.**

"Selection restored, 14 nodes, with Clear. Legend: seven named communities and 'Other, 28
communities, 1,851', 'Communities 8 to 35'. I summed it last time and I sum it again, because I do
not trust a legend I have not summed: 1,149 plus 1,851 is 3,000. Statistics: 3,000 accounts, 9,113
transfers, '1, weakly'. 'Last import: March data, accounts-2026-03.csv, transfers-2026-03.csv, Apr
3.' Provenance, first screen. Good."

**3. Finding the update.**

"Hamburger, File. 'Update with new data... New files under this analysis; March kept as a version.
1 slow result will wait for Re-run.' Then 'Add data... More rows on top of the data loaded now.'
Last time this item was called Replace data here and Update with new data in the Data panel. Now
it is Update with new data in both places, and the Data panel has the same button under the source
file. One name for one operation. Thank you."

"Small thing: the Add data warning still says 'replace March with it' and its button is 'Replace
data instead', and the dialog I get from Update ends in a button called Replace. So the operation is
Update and the verb inside it is Replace. I can live with that -- replace is what it does -- but a
careful reader will ask whether 'Replace data' is a third thing."

**4. File picker.**

"April files, 3,093 rows and 8,370 rows, today 08:40. 'The files are read on this computer;
nothing is sent.' Read it, as always. Open."

**5. The wrong door, Add data, to check it still refuses to be misused.**

"'Same columns as the data already loaded. Add data keeps March and puts April on top of it: 3,132
accounts and 17,483 transfers, and the 39 accounts not in April stay in.' 3,000 + 132 = 3,132;
9,113 + 8,370 = 17,483. Still right, still the warning I want from my triple store."

**6. The load step.**

"Files with their columns as chips: id is key, from_account source, to_account target, amount,
timestamp. 'Every column has the name it had in March, so no binding step opens.' Tells me why it
is not asking me. Counts against March: 3,093 vs 3,000, found by id 2,961, new 132, not in April
39, with no transfers 26 vs 0. 2,961 + 132 = 3,093; 3,000 - 39 = 2,961. Issue: '26 accounts have no
transfers in April. All 26 were in March; none is new. Each will be a component of its own.' That
sentence is still the right sentence at the right time."

"'same pair as March: 7,576', in the same column as 'transfers 8,370' and 'rows dropped 0'. I
raised this last round. Pairs of what -- distinct account pairs, or April rows whose pair also
occurs in March? It is still a pair count sitting in a column of row counts, with no unit. Not
fixed."

"What replays: Degree and Louvain with 5 seeded re-runs, seconds; modularity against a randomized
baseline, 'a few minutes: waits'; styles, layout, set and note carried over. Load."

**7. After the load: the replay report.**

"Accounts: found by id 2,961 of 3,000, new 132, not in April 39 with List, no transfers in April 26
with Select. 'Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no
transfers.' 3,067 + 26 = 3,093. 'Components: 1 to 27' still reads like a range to me. I know what it
means now because I have seen it before, which is not the same as it being clear."

"Results: '2 of 3 replayed. Louvain: 35 groups in March, 65 in April: 39 new, 9 lost. 26 of the new
groups are single accounts with no April transfers. Lost, their accounts now in other groups:
Communities 13, 19, 20, 21, 28, 29, 30, 32, 34.'"

"Now that is the sentence I wrote myself last time. Check: 35 - 9 lost = 26 carried over; 26 + 39
new = 65. The 26 singletons are inside the 39 new, so 13 new communities that actually have
transfers. It still makes me do 39 - 26 for the 13, but that is one subtraction on one line, not
algebra across two panels. And the 9 lost ones are named, which is what I could not find at all
last round."

"Style layers: 'the 26 matched groups keep their March name and color by overlap; the new groups
take the next names.' Last round this line said '39 are new, 26 of them single accounts' and I had
four meanings for 26 and 39 on one panel. Now 26 means matched groups here and single accounts one
paragraph up. Still two meanings for 26 on one panel -- 26 matched groups, 26 singleton groups, 26
accounts without transfers -- but each carries its own noun now, so I did not have to stop."

"Legend: '19 carried on from March's 8 to 35, 39 new' under 'Other, 58 communities, 2,070'. 19 +
39 = 58. March had 28 in 'Other' (8 to 35); 9 of them were lost, and every lost community number,
13 through 34, is in that range: 28 - 9 = 19. It reconciles. I checked it because the legend is
where people take numbers from for slides. Sum: 359 + 168 + 127 + 126 + 111 + 74 + 58 = 1,023, plus
2,070 = 3,093."

"But the 26 single accounts are still hiding inside 'Other, 58 communities'. An isolated node being
its own Louvain community is a property of the algorithm, not a finding. I would still want them as
their own legend row -- 'no transfers, 26' -- or dropped from the count by a choice I can see."

"Wording: the Results rail says '65 groups, was 35', the report says 'groups', the legend says
'communities'. Louvain produces communities. The task says groups too, so I will not die on it, but
pick one word."

**8. The left panel count.**

"Last round the Graphs row said 3,000 accounts through the whole replay while Statistics said
3,093, and that is what made me recheck everything. On this pass I was on Results while the report
was open, so I could not see the Graphs row at that moment; by the Wednesday screens it reads 3,093
accounts, and on the other project it reads 'April, 3,093' straight after the replay. Statistics
now also shows 'isolated 26' under components 27. That line is the explanation of the component
count, placed where the count is. Good."

**9. Re-run the waiting result.**

"Modularity vs randomized baseline, Re-run, a progress bar, Cancel, 'a few minutes'. Then current.
I still do not see the April modularity value, or the baseline's result, anywhere. I would put the
modularity next to '65, 13 of them new with transfers'."

**10. The comparison, March against April.**

"Compare with, March data, Apr 3, 35. Side by side, Community 33 selected on both. Right panel:
'35 groups in March, 65 in April: 39 new, 9 lost.' Matched 26, new 39, lost 9 (listed below). '26
of the new groups are single accounts with no April transfers.' Same numbers as the report. Good --
two screens, one set of numbers."

"Lost groups: 'March groups with no April match; their accounts are now in other groups.'
Community 13, 86 accounts, most now in Community 36. Community 28, 50 accounts, most now in
Community 1. Community 1 grew by 62; there is the absorption I was guessing at last round, and 36
is one of the new numbers, so that one split off rather than being absorbed. This table answers
'where did the nine go'. It is the table I would screenshot for the explanation."

"Agreement: '3 in 10 pairs of accounts that shared a group in March still share one in April, on
the 2,961 accounts in both. Without the 26 silent in April: 3 in 10. Two runs on March's data: 6 in
10. Two runs on April's data: 7 to 8 in 10.'"

"The reading is right: month to month is well below run to run, so the grouping really moved.
But which measure is this? Last round it said AMI, 0.45, with the scale explained, and I said that
was the most useful thing on the page. Now it is a sentence about pairs. 'Pairs that shared a group
still share one' is a pair-counting measure -- it sounds like the share of co-membership pairs
preserved, one direction only -- and it is not AMI. It may be the better sentence for a manager. It
is not a number I can cite. I need the name of the measure next to it, or a way to open it, and I
could not find either on this screen. For me that is a step backwards."

"And 'the 26 silent in April' -- silent is a new word for 'no transfers'. Every other screen says
'no transfers' or 'isolated'. Three words for one set."

"Grew tab: 26 matched groups, the 10 that grew most. 'holds in April's re-runs' 0 to 1: Community
33 holds 1.00, Community 25 0.44. That is a stability column per community, which I like. The Shrank
tab I did not open; the lost ones are in the right panel now, so I no longer need it for the task."

**11. Data > Versions, What changed, on another project.**

"'Payments network review', same files. April data current, What changed against March data: '27
components (was 1), large change: 26 accounts have no transfers in this version. 65 communities
(was 35), large change: 26 are single accounts with no transfers in this version.' Still the answer
in two lines. But this line does not say 39 new, 9 lost, 26 carried over. The replay report and
the comparison do; the version row -- the place I said last time I would go first -- still gives me
only the singleton half. Someone who comes in through Versions gets the weaker explanation."

"'8,370 transfers (was 9,113): 7,576 in both, 794 new, 1,537 not in April.' No. A transfer is an
event with a timestamp; no April transfer is 'in' March. This is the pair count again, now called
'in both'. Two rounds running. Say 'account pairs seen in both months' or say what identifies a
transfer."

"Past version, March: 'Methods, one sentence per run'. Louvain weighted by amount, direction
ignored, resolution 1, seed 11, full graph, 35 communities, weighted modularity 0.688, graphty-element
2.0.0, on the CPU. Copy methods text. Still the thing that lets me defend a number. The baseline
sentence still describes the test -- 'against 100 degree-preserving randomizations' -- and still
omits the result."

"Restored March: What changed against April, '35 communities (was 65), names and colors as March
data had them.' The restore is a new version on top, April stays. That is how I would want a
rollback in a store: append, never overwrite. The two failure states say what happened and that
nothing changed. Fine."

**12. The other project's update (the one that failed me last round).**

"Mule ring review, Update with transfers-2026-04.csv, one file. Issues: riskScore missing, flagged
now Y/N. Counts 3,093 nodes read, 8,370 edges, 0 rows dropped. Binding: risk_score bound by hand,
'Y is yes, N is no', Y 14, N 3,079 -- 14 + 3,079 = 3,093. Replace. After: Statistics 3,093 nodes,
8,370 edges, components '27, weakly'. The Graphs row: 'April, 3,093'."

"Last round this project said 1 component with the same file, and that was my second unexplained
failure. Now it says 27, like the first project. Same file, same answer. That is the fix that
matters most to me in this whole task."

"One thing, though. The replay report says 'Flagged and High risk re-evaluated on April's values',
and the left panel still says 'High risk, rule, 41' -- on the report screen and on the Re-run
screen. Two screens later, when a recipe is being picked, it is 52. Nothing in between explains the
change. If it was re-evaluated at replay, it should read 52 at replay. That is the same kind of
stale count that cost this tool my trust last time, on a smaller row."

"Also the Data panel's Update dialog says 'All 7 columns match March's' on a project whose accounts
file I cannot see the columns of; on the first project it was 5 plus 4. Probably different files.
I noted it and moved on."

**13. The PageRank comparison page.**

"PageRank March against April and PageRank against betweenness. Not my question. Spearman named,
ties explained, 'not plotted: the 900 tied at the bottom'. That is honest charting. Skipped the
rest."

## What she would write as the explanation

"April replaced March in the project; March is kept as a version. Louvain now reports 65
communities against 35. 26 of the 65 are single accounts: 26 accounts that had transfers in March
have none in April, so each is an isolated node and Louvain makes each its own community. Of the
other 39, 26 carry over a March community by overlap and 13 are new. 9 March communities have no
April match; their accounts moved into other communities (for example March Community 28, 50
accounts, mostly into Community 1, which grew from 297 to 359). The grouping changed beyond
Louvain's own randomness: [agreement measure, name needed] 3 in 10 between the months against 6 to
8 in 10 between re-runs on one month. Method: Louvain, weighted by amount, direction ignored,
resolution 1, seed 11, graphty-element 2.0.0."

"Everything in that paragraph came off the screens except the 13, which is one subtraction, and the
name of the agreement measure, which I could not find. Last time I built two sentences myself."

## Single Ease Question

**6 of 7.** The update is a 6 or 7: one name for the operation, a preview whose counts add up, the
wrong door warns, nothing slow runs behind my back, and the second project now gives the same 27
components as the first. The explanation moved from a 4 to a 5 or 6: the report and the comparison
state 35 to 65 as 26 carried over, 39 new, 9 lost, name the lost ones and say where their accounts
went. It is not a 7 because the agreement number lost its name, 'transfers in both' is still
wrong, the Versions row still gives only half the story, the singletons still hide in 'Other', and
the High risk row was stale for two screens after an update.

## Would she use this instead of her current tool?

"For this job -- refreshing a monthly snapshot and explaining what moved -- yes, and with fewer
conditions than last time. Today I would diff two named graphs in SPARQL, match communities by
overlap and compute agreement in pandas, and write the methods by hand. Here the diff, the kept
version, the matched, new and lost communities with where they went, run-to-run noise beside the
month-to-month change, and the methods sentence are all on screen, and nothing leaves the machine.
My conditions now: name the agreement measure, stop saying a transfer is 'in both' months, and
never show a count that the replay report says was recomputed but the panel has not caught up with.
For my own knowledge graph, still no: it reads CSV, not Turtle. That was not today's question."

## Findings, by severity

1. The between-months agreement is given as "3 in 10 pairs of accounts that shared a group in March
   still share one in April" with no measure named and no way to open its definition; the previous
   version named AMI. The sentence reads well, but it cannot be cited in a methods paragraph, and it
   does not say whether it is symmetric. (3)
2. After Update with new data on the Mule ring review project, the replay report says High risk was
   re-evaluated on April's values, but the Sets and paths row still shows "High risk, rule, 41" on
   the report and Re-run screens; it reads 52 two screens later with no explanation. A stale count
   right after an update. (3)
3. "7,576 in both" on the transfers line of What changed (and "same pair as March: 7,576" in the
   load step's row-count column) still treats a transfer as if it had an identity across months.
   Raised last round; unchanged. (3)
4. What changed on the version row still explains 65 (was 35) only by the 26 single accounts; the
   carried-over, new and lost counts appear only in the replay report and the comparison. A reader
   who arrives through Versions gets half the explanation. (2)
5. The 26 single-account communities are still counted inside "Other, 58 communities" in the
   legend, not shown on their own row or excluded by a visible choice. (2)
6. One set, three words: "no transfers", "isolated", and "silent in April" (comparison). And
   "groups" (report, Results rail, comparison) beside "communities" (legend, methods, version
   rows) for Louvain's output. (2)
7. The modularity-vs-baseline result (baseline mean or a z-score) and April's modularity value are
   still not visible after the re-run finishes. (2)
8. The operation is Update with new data, but Add data's warning says "replace March" and offers
   "Replace data instead", and the Update dialog's button is Replace. Understandable, but a reader
   may take "Replace data" for a third command. (1)
9. "Components: 1 to 27" in the replay report still reads as a range. (1)

## What worked for her

- One name, Update with new data, in the File menu, the Data panel and the file chip's menu.
- The replay report states 35 to 65 as 39 new and 9 lost with the 26 singletons named, and lists
  the 9 lost communities by number.
- The comparison's Lost groups table: each lost March community, its size, and where most of its
  accounts are now. It answered "where did the nine go", which she could not answer last round.
- The same April file now gives 27 components on both projects; the contradiction that ended her
  last session is gone.
- The Graphs row and Statistics show 3,093 after the update, and Statistics adds "isolated 26" next
  to the component count.
- The legend's "19 carried on from March's 8 to 35, 39 new" reconciles with the report exactly.
- Unchanged and still valued: Add data's warning with both outcomes' counts, the load step's counts
  against March with the 26 no-transfer accounts flagged before commit, the slow run that waits,
  run-to-run agreement beside month-to-month agreement, per-community stability across re-runs,
  and the per-run methods sentence with Copy methods text.
