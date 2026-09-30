# Real change or noise -- Dr. Min-ji Kim, knowledge graph engineer

Task as the moderator gave it: "April's transfers replaced March's in your case project, and the
ring's group looks different now. Tell me whether the accounts really changed, or whether it only
came out differently this time."

Pages used: screens/version-history.html (Data > Versions), screens/weekly-return.html (steps 10
to 13: Compare with..., the comparison surface, the new accounts' transfers, the note),
screens/comparison.html (the PageRank March-against-April comparison, for contrast). Renders:
shots/record/r6-minji-rcn-version-history.png, shots/record/r6-minji-rcn-weekly-return.png,
shots/record/r6-minji-rcn-comparison.png. The flow page flows/compare-versions.html renders as a blank
white page in the study view (shots/record/r6-minji-rcn-cv.png), so the session used the screens only.

## Think-aloud

**1. Where I start: the change log.**
"Two loads of the same analysis. Before I look at any picture I want the diff of the inputs. I
go where I would go in Git: the versions."

Data > Versions. April data current, March data under it. The April row has "2 large changes:
components, communities" and, opened, a What changed list.

"Good. This is the first thing I would have written in SPARQL anyway. 3,093 accounts, was 3,000:
2,961 in both, 132 new, 39 not in April. 2,961 plus 39 is 3,000, 2,961 plus 132 is 3,093. It adds
up. Transfers 8,370, was 9,113: 7,576 in both, 794 new, 1,537 not in April. 7,576 plus 1,537 is
9,113. Also adds up."

"But -- 'transfers in both'. A transfer in March and a transfer in April are different events.
What is the identity of a transfer here? A transaction id? The from-to pair? If it is the pair,
say 'account pairs', not 'transfers'. That is exactly the kind of noun I correct in meetings."

"27 components, was 1, flagged large change, and it tells me why: 26 accounts have no transfers
in this version. Fine, those are isolated accounts from the account table. 65 communities, was
35, and again: 26 of them are single accounts with no transfers. So of the 30 extra groups, 26
are isolates. The headline 'large change' on communities is mostly an artefact of isolates.
I like that it says so instead of letting me discover it."

Rows dropped at import: 0. "Thank you. That line is the one I always look for."

There is a Compare with... button under the What changed list. "Compare what with what? This is a
data version, not a result. If I click it I expect it to ask me which result -- Louvain -- but
nothing here says so. I will not guess; I go to the result instead."

Small thing she catches: "March data, Apr 2, here. Later in the picker it says 'March data, Apr 3'.
And the April version is 'May 4' here while the inspector on the canvas says 'Today 09:14'. And
this panel's project is 'Payments network review', but the case is 'Case 0314, mule ring' on the
other screens. Which is it? One date off by a day is exactly the thing that makes me stop
trusting every other number on the page."

**2. The result: Compare with... on Louvain.**
Results panel: Louvain communities, 65 groups, with a compare icon on the row. The picker opens:
"Compare Louvain communities with". Earlier runs: "March data, Apr 3 -- 35". Partitions on April
data: weakly connected components 27, kind (attribute) 3.

"The March run is first. Correct. And the footnote: both runs keep the 5 seeded re-runs, seeds 12
to 16, the comparison reads those and runs nothing. OK -- so it has already thought about
the fact that Louvain is not deterministic. That is the whole question I was asked. I would not
have expected a viewer to know that."

"Comparing Louvain against weakly connected components is a legitimate thing to do, by the way.
I would use that to see whether a community is just a component."

What is missing: "Were both Louvain runs made with the same settings? Resolution, weighted or
not, direction? The PageRank comparison screen says 'Unweighted, directed. Details' on each side.
Here I see nothing. If March was weighted by amount and April was not, the difference is my
settings, not the accounts. That is the first thing I need to rule out and I cannot, from this
screen."

**3. The comparison surface.**
Two canvases, "A: March data" and "B: April data", Community 33 selected: 22 in March, 32 in
April. Accounts only on one side carry half-rings; a small key says only in March 39, only in
April 132, in both unmarked.

"Half-rings for one-side-only. Shape, not hue. I can read that. The community colours -- orange
for Community 1 and the red-orange for Community 5 are close for me, but I am not reading groups
by colour here, I am reading the table, so I will live with it."

"Is position meaningful? Two separate layouts. I will not compare positions across the halves and
it does not ask me to."

Agreement block, right panel:
- 3 in 10 pairs of accounts that shared a group in March still share one in April, on the 2,961
  accounts in both.
- without the 26 silent in April: 3 in 10
- two runs on March's data: 6 in 10
- two runs on April's data: 7 to 8 in 10

"All right. This is the answer, and it is laid out the right way: the number, and next to it what
the same number is when nothing changed but the seed. Two runs on identical March data only keep
6 in 10 pairs together -- so Louvain on this graph is quite unstable on its own. March against
April keeps 3 in 10. Half the seed noise floor. That is more than 'it came out differently this
time'. The partition really moved."

"And removing the 26 silent accounts does not change it. Good, they checked the obvious
confound for me."

Then the skepticism:
- "Which measure is this? 'Pairs that shared a group in March still share one in April' -- that
  is a pair-counting, one-directional measure. It ignores pairs that were apart in March and are
  together in April. So a group that absorbed other accounts would not lower this number at all.
  Is it symmetric? Is it chance-corrected? Name it. If it is adjusted Rand or AMI, say so; if it
  is your own co-membership rate, say that and give me the formula behind an info icon."
- "'3 in 10' is rounded to the point of hiding things. 0.29 or 0.34? Give me the decimal with the
  plain sentence, not instead of it."
- "'two runs on March's data: 6 in 10' -- which two, of five seeds? April gets a range, 7 to 8,
  March gets a single figure. Same treatment for both, please: the range over all pairs of
  re-runs on each side."

**4. The ring's group itself.**
Table, Grew tab: Community 33, 22 to 32, +10, +45%, 7 new, holds in April's re-runs 1.00.
Panel: new in April 7, watchlist members in it 7 of 9, holds in April's 5 re-runs 1.00.

"1.00 holds -- on a 0 to 1 scale, and what is it? The share of member pairs that stay together
in all five runs? It says 'holds', I will read it as that. So in April the ring is a solid
group, not a seed accident. That is useful."

"Now the arithmetic. 32 in April, 7 new to the data. So 25 of April's 33 were already accounts in
March. March's 33 had 22 members. So at least 3 came in from other March groups -- and I do not
know how many of the original 22 are still in it. That is the question 'did the ring's group
change'. I want one line: of March's 22, N still in 33, M moved to which groups; of April's 32,
7 new to the data, K came from other groups. The Lost groups table does this for whole groups
('most now in Community 36') but not for the group I have selected."

"And 'holds in re-runs' only for April. Was March's 33 stable? If March's 22 were a shaky group
to begin with, the 'growth' is the March run's fault, not April's data. Give me the March column
too."

"How was March 33 matched to April 33? 'Names kept by overlap.' Overlap by what -- largest share
of members, Jaccard? With a 45 percent growth and only 26 of 35 groups matched, the match rule
matters."

**5. Why it grew.**
Step 12: selected the 7 new accounts; edge table: from_account, to_account, kinds, amount, sorted
by amount; inspector: transfers in 12, $112,916.36; transfers out 14, $115,446.43. Step 13: a
note on the kept set citing the comparison.

"This is where it becomes a data story, not an algorithm story. Seven new personal accounts each
taking roughly the same amount in and passing it on to one merchant: pass-through. That is a real
change in the transfers, and the tool let me see it in two clicks from the group. The note with a
link back to the saved comparison is how I would want provenance to work."

"Does Louvain here use amount as a weight? The Overview on the version screen says 'amount used
as similarity'. If yes, those near-identical $9,700 to $9,900 transfers are pulling the group
together; if no, it is structure alone. Again: the comparison surface should state the run
parameters."

**6. My answer to the moderator.**
"The accounts really changed, and the grouping changed more than re-running Louvain on the same
data does: 3 in 10 co-grouped pairs survive March to April, against 6 in 10 between two seeds on
March and 7 to 8 on April, and it is the same with the 26 isolated accounts removed. The ring's
group, Community 33, went from 22 to 32 accounts, 7 of them new to the data, and it holds together
in all five April re-runs. What I cannot tell you from this screen: whether both runs used the
same Louvain settings, how many of March's 22 are still in it, and whether March's group was
stable in the first place. And I would not put '3 in 10' in a report until I know which measure
it is."

## Single Ease Question

**5 of 7.** Finding the comparison was easy and the key number was placed next to its noise
floor, which is exactly right. It loses two points for the unnamed, rounded, one-directional
agreement measure, the missing run settings on the comparison, and the date and project-name
mismatches that made me recheck everything.

## Would she use this instead of her current tool?

"For this question, yes, over what I do now -- which is export two partitions from a notebook,
compute adjusted Rand in scikit-learn, and eyeball a crosstab in pandas. I would have forgotten
the seed baseline half the time; this puts it in front of me without asking. But I would still
verify the number in the notebook the first time, and if it does not match a named measure I
recognise, I go back to the notebook for good. And none of this is my RDF work -- it is a
transfer graph from CSVs. For that, it is fine. For my knowledge graph it still cannot read my
data."

## Observations for the study team (outside the think-aloud)

1. The comparison's agreement number is not named and is one-directional ("pairs that shared a
   group in March still share one"). The flow page describes it as AMI 0.45 against 0.76; the
   screen shows "3 in 10" against "6 in 10". The flow and the screen disagree on both the measure
   and the values.
2. The per-group line gives only April's stability ("holds in April's 5 re-runs 1.00"); the flow
   page says "holds together in 5 of 5 re-runs". March's stability for the same group is absent,
   and how many of March's members stayed is not stated for the selected group.
3. The Louvain comparison does not show either side's run settings (resolution, weight,
   direction), while the PageRank comparison does. A settings difference would masquerade as a
   data change.
4. Inconsistent facts across screens: March data "Apr 2" (version history) against "Apr 3"
   (picker); April data "May 4" (version history) against "Today 09:14" (weekly-return
   inspector); project "Payments network review" (version history) against "Case 0314, mule ring"
   (weekly-return).
5. Compare with... on a version row does not say what it compares (which result); she avoided it.
6. "7,576 transfers in both" needs to say what makes two transfers the same.
7. The noise floor is reported as a single figure for March and a range for April.
8. Community 1 (orange) and Community 5 (red-orange) are hard to tell apart for a deuteranomalous
   reader; the half-ring shapes and the table carried the task, so it did not block her.
9. flows/compare-versions.html renders as an empty page in the study view.
