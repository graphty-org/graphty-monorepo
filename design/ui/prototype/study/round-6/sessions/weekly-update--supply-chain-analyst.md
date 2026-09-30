# Session: monthly update and "why did the groups change" -- supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst (persona: study/personas/supply-chain-analyst.md).
Task as given by the moderator: "Last month's transfers project needs this month's file. Update it,
and explain why the number of groups changed." The same task and wording as the previous round,
where she rated it 4.33 of 7.

Screens worked through, as the participant saw them (study view, full page, rendered for this
session): shots/record/r6-dana-wu-weekly-return.png, shots/record/r6-dana-wu-data-panel.png,
shots/record/r6-dana-wu-version-history.png, shots/record/r6-dana-wu-replace-and-recipe.png,
shots/record/r6-dana-wu-comparison.png.

Outcome: success. The update went through first time, and she gave an explanation she could
defend: most of the jump from 35 to 65 groups is 26 accounts that had no transfers in April and
each count as a group of one; the rest is 9 March groups that broke up and whose accounts landed
in 13 new ones. She added her own caveat: the method only agrees with itself about 6 times in 10,
so she would not claim the reshuffle is all real.

## Transcript (thinking aloud)

### Start screen

"Recent projects. 'Case 0314, mule ring -- Transfers, 3,000 accounts, edited Apr 3.' Same as last
time: it's the only one that says transfers, so that's it. Click the card."

### The project reopens

"'Selection restored (14 nodes)'. Still don't know why I'd want that back, but it tells me, fine.
Clear.

Right side, Statistics: accounts 3,000, transfers 9,113, 'Last import: March data:
accounts-2026-03.csv, transfers-2026-03.csv. Apr 3'. Good, that's what month I'm on. 'components
1, weakly' -- still no idea what 'weakly' is. Skipping.

Legend: Community 1 297 down to Community 7 120, 'Other, 28 communities 1,851', and under it
'Communities 8 to 35'. OK, so there's the 35. I don't have to add it up this time -- the 'to 35'
tells me the total. Still, I'd rather a line that just says '35 groups'."

### Finding the update

"I want import or update. Nothing across the top. Three-line menu, File. 'Update with new
data...' and the line under it: 'New files under this analysis; March kept as a version. 1 slow
result will wait for Re-run.' That's my word, 'update'. And 'March kept' answers my first worry.
Last time the menu said 'Replace' and the data panel said 'Update' -- now they match.

'Add data...' is just under it: 'More rows on top of the data loaded now.' That's clearer than
last time too. More rows on top -- no, I don't want April stacked on March. Update."

(On the data panel, the same button reads 'Update with new data...' under the source file.)

"Same words on the data side. Good."

### Picking the files

"'Choose files for Update with new data', 'this computer'. accounts-2026-04 and transfers-2026-04,
today 08:40, 3,093 and 8,370 rows, both already picked. '2 selected. The files are read on this
computer; nothing is sent.' That's the sentence for IT. Open."

### If I had picked "Add data" instead

"It still catches me: 'Same columns as ... the data already loaded. Add data keeps March and puts
April on top of it: 3,132 accounts and 17,483 transfers.' And 'Replace data instead'. -- Hm, the
button says 'Replace data instead' but the menu item is now 'Update with new data'. Small thing. I
know what it means. But it's the one place the old word is left."

### The update dialog

"'Update with new data: April files'. Columns as tags, 'Every column has the name it had in March,
so no binding step opens.' Fine.

The table: 'Counts, against March'. April 3,093 vs 3,000; found by id 2,961; new 132; not in April
39; with no transfers 26 vs 0; transfers 8,370 vs 9,113; and a new row, 'same pair as March
7,576'. So 7,576 of April's transfers are between the same two accounts as a March one. That's
the kind of line I'd put in my reconciliation tab -- repeat business. Rows dropped 0 and 0.
Still the best thing on the screen.

Issue: '26 accounts have no transfers in April. All 26 were in March; none is new. Each will be a
component of its own.' Component again. I'm guessing it's 'a group of one'. 'Show rows' -- I'd
look at who they are.

'What replays': 'Degree; Louvain with its 5 seeded re-runs -- seconds.' 'Modularity vs randomized
baseline -- a few minutes: waits.' I still don't know what either one is, and nothing tells me
what question the second one answers. '2 style layers, the layout, 1 set, 1 note -- carried
over.' Good. Load."

### After the load: the replay report

"Version history on the right: April data today 09:14, March data Apr 3. Replay report.

Accounts: found by id 2,961 of 3,000; new 132; not in April 39 'List'; no transfers in April 26
'Select'.

'Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no transfers.'
Right, that confirms my guess: a component is a clump that's connected, and the 26 quiet ones are
a clump each.

Results: '2 of 3 replayed. Louvain: 35 groups in March, 65 in April: 39 new, 9 lost.' In bold.
THAT is the sentence. 35 minus 9 lost is 26 kept, plus 39 new is 65. It adds up and it says it in
one line. '26 of the new groups are single accounts with no April transfers.' So of the 39 new,
26 are those quiet accounts, and 13 are real new groups. I still did that subtraction myself, but
it's one subtraction, not the three I did last time.

'Lost, their accounts now in other groups: Communities 13, 19, 20, 21, 28, 29, 30, 32, 34.' Last
time my question was where the 9 went. Now it says: they broke up, and their people went into
other groups. OK. 'Community 13' means nothing to me as a name, but it answers the question.

'Not replayed: Modularity vs randomized baseline, a few minutes. It waits in Results.' Yellow
again.

Watchlist: '7 of 9 members in April; ACC-705989, ACC-243731 are not in this data.' Good, it named
them. That's what I'd want for a supplier on a watchlist that stopped showing up.

'Style layers and positions: Community color: the 26 matched groups keep their March name and
color by overlap; the new groups take the next names.' OK, so Community 1 in April is 'the same'
Community 1 as March. That's the thing that confused me last round with the 26 and 39 swapping
places -- now each number has its own noun. 26 matched, 39 new, 9 lost, 26 single. I didn't have to
read it three times.

'Size: degree: domain refit to April, 0 to 842, was 1 to 907.' Zero because of the quiet ones.
Fine."

### The legend and the Results list

"Legend: Community 1 359 ... 'Other, 58 communities 2,070', and '19 carried on from March's 8 to
35, 39 new'. I had to stop on that. 19 carried on from 'March's 8 to 35' -- meaning the old
groups numbered 8 to 35, 19 of them are still around? Plus the 7 named ones is 26 matched. It
checks out, but that's a sentence for someone who already knows the answer.

Results list: Degree 'Replayed'; Louvain communities 'Replayed; 65 groups, was 35'. Good, the
headline is right there on the row. Modularity vs ran... with the yellow '!' and 'Re-run', 'Out of
date; a few minutes'. The rail says '1 out of date', 'Review'.

I'm going to be honest, I'd press Re-run again just to get rid of the yellow. Nothing on this row
tells me what it's for. If it doesn't matter for my question, don't make it yellow."

(The storyboard shows it running with a progress strip and Cancel; afterwards it reads 'current'.
She never learns what it said.)

### The comparison, March against April

"'Compare Louvain communities with...' -- I pick 'March data, Apr 3, 35'. A note says 'Both runs
keep the 5 seeded re-runs made with them ... the comparison reads those and runs nothing.' Fine,
it doesn't cost me anything.

Two pictures, March and April. Hairballs, with half-rings on some dots: 'only in March 39', 'only
in April 132'. The pictures still don't tell me anything. The right side does.

'Groups: 35 groups in March, 65 in April: 39 new, 9 lost.' Same sentence as the report. Same
numbers on both screens this time. 'matched groups 26, new groups 39, lost groups (listed below)
9. 26 of the new groups are single accounts with no April transfers.'

Agreement: '3 in 10 pairs of accounts that shared a group in March still share one in April, on
the 2,961 accounts in both.' That's in English now, not 'AMI 0.45'. I can say that sentence.
'without the 26 silent in April: 3 in 10'. So the quiet ones aren't what moved people around.
'two runs on March's data: 6 in 10'. 'two runs on April's data: 7 to 8 in 10.'

Wait. Wait. Two runs on the SAME March file only agree 6 in 10? So if I run this twice on the same
data, 4 in 10 pairs of accounts land in different groups? That's the number that worries me. I
understand it now -- which is good, it's honest -- but what it tells me is the grouping is shaky
even with nothing changing. 3 in 10 month to month is a lot worse than 6 in 10 run to run, so
something real did change. But if my VP asked 'so is Community 27 a real thing', I'd have to say
'mostly'. For suppliers that's not good enough to act on.

Lost groups table: 'March groups with no April match; their accounts are now in other groups.'
March group, accounts, most now in. Community 13, 86, most now in Community 36. Community 19, 78,
now in Community 8. Community 28, 50, now in Community 1. That's a table, I can read that. So
Community 13 went into a brand-new group, and Community 28 got folded into the biggest one. That
is the 'why'. If my groups were suppliers, that's 'these 50 suppliers used to be their own
cluster and now they trade mainly with the Community 1 crowd'.

The Grew / Shrank / New in April table underneath: 26 matched groups, the 10 that grew most.
Community 1 297 to 359, +62, +21%, 28 new. Community 27 52 to 107, +106%. Readable.

'holds in April's re-runs, 0 to 1' -- still don't know. 0.88, 0.59, 1.00. I think it's 'how sure
it is about this group'. If so, Community 27 at 0.59 is the one I'd not quote. But I'm guessing,
and it says 0 to 1 instead of saying what it means.

There's a '...' at the right of the table. I'd click it hoping for 'Export'. I want Grew, Shrank,
New and Lost in a CSV for Power BI. Nothing on the screen says it's there."

### Version history in the data panel

"Versions: April data, current. 'What changed, against March data (Apr 2)': '27 components (was 1)
-- large change -- 26 accounts have no transfers in this version.' '65 communities (was 35) --
large change -- 26 are single accounts with no transfers in this version.' '3,093 accounts (was
3,000): 2,961 in both, 132 new, 39 not in April.' '8,370 transfers (was 9,113): 7,576 in both,
794 new, 1,537 not in April.' 'Rows dropped at import: 0'.

That's still the cleanest page. But the communities line here only has half the story -- the 26
single accounts. It doesn't say '39 new, 9 lost' like the report and the comparison do. If this
was the only place I looked, I'd tell the VP 'it's the 26 quiet accounts' and be wrong about the
other 13.

And this is 'Payments network review', not 'Case 0314'. April 'May 4', where the other screen said
'today 09:14'. March 'Apr 2' here, 'Apr 3' there. Size legend 'degree, 1 to 842' here, '0 to 842'
there. I think these are just different projects, but I notice dates.

One more. The Overview on this page says April was loaded with 'amount used as similarity', and
the March data panel says 'amount not used yet'. Did the update change how the groups are worked
out? If the rules changed between months, then of course the groups changed. Nobody said so on
the update screens -- 'What replays' just said 'Louvain'. That would be the first question from
anyone who checks my work."

### The other update screen

(On replace-and-recipe, project 'Mule ring review', a single transfers file.)

"Menu: 'Update with new data...', '1 slow result will wait for Re-run'. Same word. The dialog is
called 'Update with transfers-2026-04.csv'. It shows the mapping, and 'amount: currency; weight:
flow'. Issues: riskScore is missing, flagged is now Y and N instead of yes and no, the next step
asks how to read them. That's exactly what SAP does to me every other quarter, and it caught it,
with four sample rows so I can see the Y and N for myself. Good.

Binding step: risk_score matched by hand, 'Y is yes, N is no', and it tells me what switches off
if I leave it. Fine.

Report: '4 replayed', 'Cycles up to 6 transfers not replayed: a few minutes. Re-run'. Mule ring 14
of 14 members. No group count on this one at all. Last time this screen said 12 groups where the
other said 65, and that killed it for me. Now it doesn't say -- so at least it doesn't contradict.
But the notice says '4 of 5 results replayed' and I can't see which five."

### The PageRank comparison page

"This is a different comparison -- PageRank, March and April, a scatter. '49 of the top 50 in both
months.' 'PageRank gives the same result every run, so a re-run cannot tell change from noise.'
Well, that's the opposite of the groups, then: this one I can trust run to run. Not what I was
asked. 'Export table...' is on this page, top right of the table. I want that same button on the
groups table."

### Her answer to the moderator

"The group count went from 35 to 65. 26 of that is accounts that were active in March and did
nothing in April -- the tool counts each of those as a group of its own, so that part isn't real.
Take them out and it's 35 groups to 39. Of March's 35, 26 carried over, most of them bigger, and 9
broke up -- their accounts moved into other groups, some into brand-new ones and some into the
biggest one. That's where the 13 genuinely new groups come from. Caveat: the method only agrees
with itself about 6 times in 10 on the same month, so I'd treat individual small groups with
care."

### Single Ease Question

"5. The update is easy now -- one word, it caught my Add mistake, the reconciliation table is
there, my setup came over. The explanation is mostly handed to me: one sentence, 39 new, 9 lost,
and a table of where the lost ones went. I lose points for the '6 in 10' thing, which I only
understood because they finally wrote it in English and then wished I hadn't; for the yellow
Re-run nobody explains; for the version history telling half the story; and for not being sure
whether 'amount' changed the rules between months."

### Would she use this instead of her current tool?

"Not instead. For the monthly reload, honestly, this beats what I do in Excel: the April-vs-March
counts table and 'nothing is sent' are things I build by hand today. But the 'groups' are the
headline, and for suppliers I'd have to explain what a group means to the business, and then
admit the tool reshuffles 4 in 10 of them on a re-run. My VP looks at Power BI, and I didn't see
an export on the table I actually need. And IT still has to sign off -- 'nothing is sent' is a good
start, they'll want it in writing. So: a side tool I'd open once a month for the reload and the
change log. Not a replacement."

## Findings

Ranked most serious first. Severity: 4 = would stop her or make her distrust results, 3 = serious
delay or wrong answer, 2 = friction, 1 = cosmetic.

1. (3) The agreement figures, now in plain words, tell her two runs of the grouping on the same
   March data agree only "6 in 10". She read that correctly and concluded the groups are too
   unstable to act on for suppliers. Nothing on the screen says what she can safely conclude from
   "3 in 10 month to month against 6 in 10 run to run", or which groups are stable enough to
   quote. The per-group column that might answer it is labelled only "holds in April's re-runs,
   0 to 1".
2. (3) The version-history change log says "65 communities (was 35) -- 26 are single accounts
   with no transfers" but not "39 new, 9 lost". A reader who stops there, as the change log
   invites, explains only 26 of the 30-group rise.
3. (3) April's overview says "amount used as similarity" while March's data panel says "amount not
   used yet". If the weighting changed between versions, part of the group change is a method
   change, and nothing on the update, the replay report or the comparison says so.
4. (2) "Modularity vs randomized baseline" still carries a yellow warning and a Re-run button with
   no sentence saying what question it answers. She would run it only to clear the warning.
5. (2) No visible export on the group comparison tables (Grew, Shrank, New in April, Lost groups).
   The PageRank comparison has "Export table..."; the group one has only an unlabelled "...".
6. (2) The legend line "19 carried on from March's 8 to 35, 39 new" is correct but only readable
   once you already know the answer.
7. (2) Dates, names and ranges still differ between screens of one story: April "today 09:14"
   versus "May 4"; March "Apr 3" versus "Apr 2"; degree "0 to 842" versus "1 to 842"; project
   "Case 0314" versus "Payments network review".
8. (2) The second update screen's notice says "4 of 5 results replayed" without naming the five,
   and reports no group count at all.
9. (1) The "Add data" guard still offers "Replace data instead" although the menu now calls it
   "Update with new data".
10. (1) Graph terms still come before any plain sentence: "components, weakly", "Louvain", "seeded
    re-runs", "component of its own". "Component" is only explained in the replay report.
11. (1) She still subtracted 26 from 39 herself to get the 13 genuinely new groups.

## What worked for her

- One name for the action everywhere she looked: "Update with new data...", with "March kept as a
  version" under it.
- The one-sentence reconciliation, "35 groups in March, 65 in April: 39 new, 9 lost", identical in
  the replay report and the comparison. Last round two screens gave two different counts; this
  round nothing contradicted.
- The Lost groups table (March group, accounts, most now in): the direct answer to "where did the
  groups go".
- Agreement written as "3 in 10 pairs of accounts that shared a group in March still share one in
  April" instead of a coefficient.
- The "Counts, against March" table in the update dialog, now with "same pair as March".
- The "Add data" guard that stops her appending April under March and double counting.
- The Watchlist line naming the two members missing from April.
- A renamed column and a Y/N flag caught before load, with sample rows.
- "The files are read on this computer; nothing is sent" at the file picker.
