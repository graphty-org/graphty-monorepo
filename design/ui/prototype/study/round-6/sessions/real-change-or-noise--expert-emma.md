# Session: real change or a different Louvain draw -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, graph-tool),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "April's transfers replaced March's in your case project, and the
ring's group looks different now. Tell me whether the accounts really changed, or whether it only came
out differently this time."

**Screens, in order:** the case project reopened on March's data with the ring selected, the Results
rail after the April update with the out-of-date results re-run, the Compare with... picker on the
Louvain row, the side-by-side comparison of March and April with Community 33 selected, the follow-up
on the seven new accounts' transfers (all screens/weekly-return.html); Data > Versions with its What
changed list (screens/version-history.html); the PageRank March-against-April comparison, looked at
for contrast (screens/comparison.html, second section).

**Renders she saw (study view):** shots/record/r6-emma-rcn-wr-reopened.png,
shots/record/r6-emma-rcn-wr-rerun.png, shots/record/r6-emma-rcn-wr-compare-pick.png,
shots/record/r6-emma-rcn-wr-compare-tall.png, shots/record/r6-emma-rcn-version-history.png,
shots/record/r6-emma-rcn-cmp-versions.png.

---

## Think-aloud transcript

**Reading the task.** Right. This is the question I get from every client with a monthly extract, and
it is two questions stuck together. One: did the data change around the ring -- new accounts, new
transfers, accounts gone. That is a set difference, no algorithm needed. Two: did the partition change
more than Louvain changes against itself on the same data. Louvain is order-dependent and seeded; run it
twice on March and you do not get the same 35 groups. So what I want is: a partition similarity (AMI or
ARI, named), the same measure between seeds on each month as a noise floor, and the ring's group
tracked through both. In the notebook that is twenty lines of sklearn and a loop over seeds. Let me see
whether this gets there faster.

**The project as I left it (March).** Case 0314, mule ring. "Nothing has been sent from this project",
fine, I have read that line before. Fourteen selected, the legend says Louvain community, Community 1 at
297, "Other, 28 communities" -- so 35 in March. The legend at least names Louvain. It does not name the
resolution or whether it used amount as weight. Park that.

**After the April update, Results.** Degree current, Louvain communities current, and a "Modularity vs
randomized baseline" running with a Cancel. Good, it is not blocking me. Legend now: Community 1 at 359,
"Other, 58 communities", and a line "19 carried on from March's 8 to 35". So 65 groups in April and it
has tried to keep March's names on the ones it could match. That is useful -- otherwise Community 33 in
April is just a label with nothing to do with Community 33 in March, and people get that wrong
constantly. But I want to know how it matched: best overlap? Hungarian on the contingency table? It
says "by overlap" in the Versions legend later. Okay, loose, but it is something.

Accounts 3,093, transfers 8,370, components "27, weakly", isolated 26. So April has 26 accounts in the
accounts file with no transfers at all. Louvain puts each isolate in its own community. There is a big
chunk of my 35-to-65 already, before anything interesting happened.

**Finding the comparison.** Where do I compare? I look at the Louvain row. There is an icon at the right
end of it when it is highlighted, the two-arrows thing. No label. I would hover it and hope for a
tooltip; I would honestly try right-click on the row first. Right-click is where I expect "compare",
and I am told the moderator's mock has it there too, but the only thing I can actually see is an
unlabelled glyph. Found it, but by luck.

**The picker.** "Compare Louvain communities with". Earlier runs: "March data, Apr 3 -- 35". Then
"Partitions on April data": weakly connected components (27), kind (attribute) (3). Oh, that is nice,
actually. Comparing Louvain against the component partition is exactly the sanity check nobody does; if
Louvain's groups are mostly just components, you have learned nothing.

And the footer: "Both runs keep the 5 seeded re-runs made with them (seeds 12 to 16); the comparison
reads those and runs nothing." Good. That is the noise floor, and it tells me the seeds. Five is thin
-- I would use twenty or fifty -- but it is honest about the number. Question it does not answer: which
seed produced the partition I am looking at? Is the displayed partition seed 12, or an unseeded run and
12 to 16 are extra? I would want that written down.

Small thing: "Apr 3" here. Data > Versions later says March data is "Apr 2". One of them is wrong, or
one is the run date and one is the import date. It does not say which. I will note it and move on,
but this is exactly the kind of thing a reviewer circles.

I pick March data, Apr 3.

**The comparison surface, the group counts.** "35 groups in March, 65 in April: 39 new, 9 lost." Then
matched 26, new 39, lost 9. Check: 26 + 9 = 35, 26 + 39 = 65. It reconciles. Thank you. "26 of the new
groups are single accounts with no April transfers." There it is -- the isolates, said out loud. So of
39 new groups, 13 are real new groups. The headline "35 to 65" is mostly an artefact of Louvain on
isolates and I would like that said in the first sentence, not the fourth line, because a client
reads the first sentence and stops.

**Agreement.** "3 in 10 pairs of accounts that shared a group in March still share one in April, on the
2,961 accounts in both." Then: without the 26 silent in April, 3 in 10. Two runs on March's data: 6 in
10. Two runs on April's data: 7 to 8 in 10.

Okay. Let me think about what that measure is. It is pairs co-assigned in March that remain co-assigned
in April. That is a one-directional pair-counting thing -- the "stays together" half of a Rand index,
or pair precision if you like. It is not AMI and it is not ARI, and it does not say what it is. It is
also dominated by the big groups: Community 1 alone has 297 choose 2, about 44 thousand pairs, and
everything small is a rounding error. It punishes splits and ignores merges. I cannot put "3 in 10" in
a report without its name and its formula. Where is the citation? There is no info icon on Agreement,
the PageRank comparison has one next to Spearman. Here, nothing.

That said, the logic of the panel is right, and I will give it that. Between months: 3 in 10. Between
seeds within a month: 6 in 10 and 7 to 8 in 10. The cross-month number is well below the within-month
floor, measured the same way. So globally, yes, the partition changed more than Louvain changes against
itself. The data changed. I would still want to see it as AMI with the seed spread, but the direction
of the answer does not depend on my preferred measure here; the gap is large.

What the panel also says, and does not point out: 6 in 10 between two seeds on the same March data.
Four in ten co-member pairs split when you just change the seed. That is a shaky partition. Leiden
would do better. This is exactly why I do not trust single Louvain runs, and I would tell the client
that the global community structure in March was never that solid to begin with.

**The ring's group, Community 33.** Selected in the table. March 22, April 32, +10, 7 new, "holds in
April's re-runs" 1.00. Inspector: March to April 22 to 32, new in April 7, Watchlist members in it 7 of
9, holds in April's 5 re-runs 1.00. Side by side, the right half-rings are the accounts only in April.

So: 1.00 means in all five April seeds these accounts end up together. Good, the April group is not
noise. But -- what is "holds", exactly? The column header says 0 to 1. Is it the best-match Jaccard
averaged over re-runs? The fraction of re-runs where the group reappears above some overlap? I am
guessing. And I only get April's re-runs. Did Community 33 hold in March's re-runs? If March's
Community 33 was a 0.5 group, then "22 to 32" is partly March being mushy, not April being new. The
column is right there; give me the March one next to it.

Then the arithmetic. 32 in April, 7 are brand-new accounts. So 25 were accounts that already existed in
March. March's group had 22. So at least 3 accounts joined from other March groups -- and I do not
know how many of the original 22 left. "22 to 32" does not tell me whether the core is the same core.
What I want is three numbers: stayed, left, joined from elsewhere. Stayed is the thing the investigator
cares about. I could get it by clicking back and forth between sides and counting rings, which is the
kind of thing I stopped doing in 2015.

**Why it grew -- the seven new accounts.** "Create set", then the Edges table of those 7: 26 transfers,
six of them take about 18 to 19 thousand dollars from two ring accounts and send it on to a merchant and
a ring account. Sum at the top of the amount column. That is the answer to "did the accounts really
change": yes -- seven accounts that did not exist in March now carry ring money, and no seed of Louvain
invents new accounts. That part is not an algorithm artefact, it is in the transfers file. Good; and
the table next to the picture is what I wanted in minute one.

**Data > Versions, for a second opinion.** April data current, "What changed, against March data (Apr
2)". 27 components (was 1), large change, 26 accounts have no transfers, Select. 65 communities (was
35), large change. Accounts 3,093 (was 3,000), 2,961 in both, 132 new, 39 not in April. Transfers
8,370 (was 9,113), 7,576 in both, 794 new, 1,537 not in April. Rows dropped at import: 0.

This is the page I would actually start from, and the numbers agree with the comparison (132 and 39,
2,961). And "rows dropped: 0" -- I check column counts after every import because of GEXF, so this line
is worth more to me than anything else on the screen.

Two things bother me. First, the project here is "Payments network review", not "Case 0314, mule ring".
Is this the same project? Probably a mock inconsistency, but if I saw that in a real tool I would stop
and check I had not opened the wrong file. Second, the overview line: "direction followed, amount used as
similarity". So the Louvain -- is it weighted by amount? The PageRank comparison says "Unweighted,
directed" with a Details link. The Louvain comparison says nothing: no resolution, no weight, no
directedness, no Q for either month. For a partition I need all four before I can say anything to
anyone. And 1,537 transfers gone in a month is a lot -- 17 percent. That could be the bank changing the
extract, not the ring changing behaviour. The tool cannot know that, but I should not forget it.

There is also a "Compare with..." on the version itself. I do not know what that compares -- every
result at once? Just the data? I did not click it; the Louvain row was the one that answered the question.

**My answer to the moderator.** The accounts really changed. Seven accounts that did not exist in March
joined the ring's group, and their transfers are ring-sized pass-throughs; that is in the data, not in
the algorithm. The April group is stable across five seeds. The overall partition also changed more
than Louvain's own seed-to-seed wobble, 3 in 10 against 6 to 8 in 10. But I would not sign the second
half yet: I do not know what the agreement measure is, I do not know if the March ring group was stable
in March's own re-runs, I do not know how many of the original 22 stayed, and I do not know the
resolution or whether amount was the weight. The first half, yes. The second half, "probably, show me
the formula".

---

## Single Ease Question

**4 out of 7.** Getting to the comparison was quick once I found the icon, the picker is honest about
seeds and runs nothing, the counts reconcile, and the noise floor is right there next to the between-month
number -- that is the right design and I have not seen a GUI do it. It lost points because the one
number that decides the question has no name, the ring's group only shows stability on one side, and I
had to do subtraction to learn that its membership moved.

## Would she use this instead of her current tool?

"For this particular question, the monthly 'did it change or is it Louvain' check -- partly. I would
still compute AMI over twenty seeds in the notebook, because I need a number with a name for the report.
But I would open this to find where to look: the lost-groups list, the half-rings on new accounts, Create
set, then hand the set and the side-by-side to the investigator. That hand-off is the bit my notebook
cannot do. If the agreement row said which measure it is and let me export the per-group table, I would
stop re-deriving the set differences by hand. Fine. That is good. Name the measure."

---

## Problems observed

1. The agreement measure ("3 in 10 pairs ... still share one") is not named and has no formula or info
   link, unlike Spearman on the PageRank comparison. It reads as one-directional pair agreement, which is
   neither AMI nor ARI and is dominated by large groups; she cannot cite it. Severity 3.
2. The Louvain comparison shows no run parameters for either side: resolution, whether amount is the
   weight, directedness, the seed of the displayed partition, modularity Q. The PageRank comparison has
   a parameter line and Details per side; this one has neither. Severity 3.
3. "holds in April's re-runs" is shown only for April. The same number for the March group is missing, so
   she cannot tell whether "22 to 32" reflects an unstable March group rather than a changed ring. The
   meaning of "holds" (0 to 1) is also undefined. Severity 3.
4. Community 33's change is given as "22 to 32" and "7 new". Stayed, left, and joined-from-other-groups
   are missing; she had to subtract to learn at least 3 moved in, and cannot learn how many of the 22 left.
   Severity 2.
5. The headline "35 groups in March, 65 in April" leads; that 26 of the 39 new groups are isolated accounts
   comes three lines later. A reader who stops at the first sentence overstates the change. Severity 2.
6. The Compare with... entry on the Louvain row is an unlabelled icon that appears on the highlighted row;
   she found it by chance and would have tried right-click first. Severity 2.
7. The within-month agreement (6 in 10 between two seeds on March) signals a shaky partition, but nothing
   points this out or suggests more seeds; five re-runs is a thin noise floor. Severity 2.
8. Dates disagree: the picker says the March run is "Apr 3"; Data > Versions says March data is "Apr 2",
   without saying which is the import date and which the run date. Severity 1.
9. Data > Versions shows the project as "Payments network review" while the rest of the task is "Case
   0314, mule ring"; she would stop to check she had the right file open. Severity 1.
10. The data version itself has a "Compare with..." whose scope (data, every result, or one result) is not
    stated. Severity 1.

## What delighted her

- The picker offers the component partition and an attribute as comparison targets, not only the earlier
  run -- "comparing Louvain against components is the sanity check nobody does."
- The picker states the seeds (12 to 16) and that the comparison computes nothing new.
- Between-month agreement sits right next to the same measure between seeds within each month: the noise
  floor is on the screen.
- Group counts reconcile exactly (26 + 9 = 35, 26 + 39 = 65) and the isolated singletons are called out.
- Community names carried over from March by overlap, so Community 33 means the same group on both sides.
- Data > Versions: counts of accounts and transfers in both, new and gone, and "Rows dropped at import: 0".
- Create set from the comparison, then the transfers of the seven new accounts with a summed amount column,
  answers "did the accounts really change" with the data itself.
