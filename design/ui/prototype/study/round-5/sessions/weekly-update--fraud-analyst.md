# Session: monthly update of the transfers project -- Sarah, fraud analyst

Participant: Sarah, level-2 financial crime investigator (study/personas/fraud-analyst.md).
Task as read to her: "Last month's transfers project needs this month's file. Update it, and
explain why the number of groups changed."
Mode: mandated. Her team lead asked for the update, so she keeps going when annoyed and lists
her workarounds instead of quitting at five minutes.
Pages worked, as the participant sees them (study view): storyboards/weekly-return,
screens/weekly-return, screens/data-panel, screens/version-history, screens/replace-and-recipe,
flows/replace-and-recipe, screens/comparison.
Renders used: shots/r4-sarah-weekly-*.png (full-page study renders made for this session) and
shots/record/r4-sarah-weekly-dp-s4.png (the data panel's Update with new data dialog).

## Transcript (think-aloud)

**Start screen.** "Recent projects. Case 0314, mule ring, 3,000 accounts, edited Apr 3. That's
mine -- well, that's the one. I click the card." The thumbnail is the same confetti ball as every
network tool. "I don't need the picture on the card, I need the date and the file names. Date's
there. Fine."

**The project as she left it.** "Selection restored, 14 nodes. OK, somebody's words, not mine, but
it's the 14 I had. Statistics: 3,000 accounts, 9,113 transfers, last import March data,
accounts-2026-03.csv and transfers-2026-03.csv. Good, it tells me which files. That's the first
thing an examiner asks." She reads the legend. "Community 1 through 7, then 'Other, 28
communities'. So thirty-five groups in March. I had to add that up myself. Write 35 somewhere,
don't make me do arithmetic on a legend."

**Finding the update.** "Where do I put April in? I don't see an 'update' button on this screen."
She opens the hamburger, File. "Replace data... 'New files under this analysis; March kept as a
version.' Add data... 'More rows on top of the data loaded now.'" Long pause. "Hm. Honestly, on a
case I want both months. Money moved in March, money moved in April, it's the same ring. If I
replace, March's transfers leave the chart. Add sounds like what I do in Excel -- I paste April
under March."

**She clicks Add data first** (the dashed "other door" on the storyboard). "Oh, it's arguing with
me. 'Same columns as the data already loaded. Add data keeps March and puts April on top: 3,132
accounts and 17,483 transfers. To see April alone, replace.' Well -- maybe I do want 17,483. But
the task says update, and the project is 'last month's'. And the 39 accounts not in April, those
are the ones I'd actually want to keep in the picture." She hesitates. "OK, the lead said update.
I'll replace. But I'm writing down that I'd want both months together for the SAR, with dates on
the links, and this made me pick one."

**Replace data, file picker.** "accounts-2026-04.csv, transfers-2026-04.csv, today 08:40, 3,093
rows and 8,370 rows. Both already ticked. 'The files are read on this computer; nothing is sent.'
Good. That line I'd screenshot for IT." Open.

**The load step.** "5 of 5 columns matched, 4 of 4 matched, 'every column has the name it had in
March, so no binding step opens'. Good, no import wizard. That alone beats i2." She reads the
table. "Accounts 3,093 against 3,000. Found by id 2,961. New 132. Not in April 39. With no
transfers 26. Transfers 8,370 against 9,113. Rows dropped 0." She checks it: "2,961 plus 132 is
3,093. 2,961 plus 39 is 3,000. OK, it adds up. I like that it shows the arithmetic." Then the
issue line: "26 accounts have no transfers in April. All 26 were in March; none is new. Each will
be a component of its own." "Each will be a what? A component. That's a developer word. I think
it means each one stands alone. Why is that an issue? That's 26 accounts that went quiet. In a mule
case that's not a data problem, that's a finding. Mules get burned and dropped."

"What replays: Degree, Louvain with its 5 seeded re-runs, seconds. Modularity versus randomized
baseline, a few minutes, waits." "I don't know what either of those last two are and I'm not
going to click them. Load."

**After the load.** Notice: "Data replaced: 2 of 3 results replayed. Show report." She clicks
Show report. Version history opens on the right with a replay report. "Components: 1 to 27. One
holds 3,067 accounts; the other 26 are the accounts with no transfers." "OK so components went
from 1 to 27 because of the 26 quiet ones. Makes sense. Then: 'Louvain, with its 5 seeded
re-runs: 65 communities, was 35. 39 have transfers; 26 are single accounts with none.' There it
is. That's my number of groups. 35 to 65."

She reads further, slowly. "'Community color: 26 communities keep their March name and color by
overlap; 39 are new, 26 of them single accounts.' Wait." She goes back up. "Thirty-nine have
transfers. Thirty-nine are new. Thirty-nine accounts not in April. That's three different 39s on
one panel. And 26 keep their name, and 26 are single accounts, and 26 have no transfers. I have to
explain this to Priya in three sentences and every number on the panel is 26 or 39." She works it
through on paper: "65 is 26 carried over plus 39 new. Of the 39 new, 26 are the single dormant
accounts, so 13 real new groups. And March had 35, only 26 carried over, so 9 March groups are
gone -- merged or split, it doesn't say which. Nobody wrote that for me. I had to."

**Watchlist line.** "Watchlist: 7 of 9 members in April; ACC-705989, ACC-243731 are not in this
data." "That is the most important line on the screen and it's in grey in the middle of a
paragraph. Two of my watchlist accounts vanished from April. Closed? Moved bank? I need that at the
top, in red, with a list I can copy." She notes the Sets panel later does put "7 of 9" with a
warning icon next to Watchlist. "OK, better. That I'd see."

**Checking the counts around the screen.** The Graphs list says "Transfers, 3,000 accounts" in
several frames after the April load; the Statistics block says 3,093. "Which is it? It's April
now, the list still says 3,000. If I print this and a reviewer sees 3,000 on the left and 3,093
on the right, that's a QA finding." (In a later frame the list reads 3,093.)

**The Version history page** (screens/version-history). "This is what I wanted in the first place.
'What changed, against March data. 27 components (was 1), large change: 26 accounts have no
transfers in this version. Select. 65 communities (was 35), large change: 26 are single accounts
with no transfers in this version.' 3,093 accounts (was 3,000), 2,961 in both, 132 new, 39 not in
April, List. 8,370 transfers (was 9,113). Watchlist 7 of 9." "This card I could paste into the case
file almost as is. The 'Select' and 'List' links are good -- I click List and I get the 39. That's
my VLOOKUP, done." Complaint: "It says 'large change' with a yellow icon. Large compared to what?
And it still doesn't say the other half of the story: 39 minus 26 is 13 new real groups and 9 March
groups gone." The legend here says "39 new communities numbered 36 to 74." "36 to 74 is 39 numbers.
Fine. But now I've got Community 33 in the ring and Community 74 somewhere, and none of them mean
anything to a reviewer."

She notices the project on this page is called "Payments network review", dated May 4, not Case
0314 dated today. "Different project? Same files, same numbers. Whatever. If this were real I'd
think I opened the wrong case."

**The comparison, Wednesday on the storyboard.** "Agreement (AMI): March and April 0.45. The same
without the 26 silent: 0.45. 5 re-runs on March 0.76 to 0.77. 5 re-runs on April 0.81 to 0.85. '1
is the same partition, 0 is chance. Louvain is random, so runs on the same data differ too.'" Long
silence. "So if I run it twice on the same month, the groups don't come out the same either? Then
why am I explaining a change in the number of groups at all? Part of the change is the program. I
can't put 'AMI 0.45' in a SAR. I can put 'the grouping program gives slightly different groups each
time it runs, so we compared on the accounts, not the group numbers.'" She does like the Grew table:
"Community 33, 22 in March, 32 in April, 7 new, 'holds in April's re-runs 1.00'. OK, that one is
solid, it comes out the same every time. That's the ring. Selecting a row selects its accounts on
both sides -- good, then I get the transfers underneath with amounts. $9,889.06, $9,834.51 --
under ten grand each. Structuring. That's the case, not the 65."

**Replace-and-recipe screens.** She opens them because the moderator listed them. "Mule ring
review, File, Replace data... Replace data with transfers-2026-04.csv. Here it's a mapping step:
riskScore missing, flagged now Y and N not yes and no. 'Y is yes, N is no.' Good -- that's exactly
the kind of thing that breaks my pivot in Excel and nobody notices. Y 14, N 3,079. Adds to 3,093."
Then the results after replace: "'Weakly connected components: Replayed; unchanged: 1 component.'
And right under it, Statistics: components 27, weakly. It says unchanged and 27 on the same screen."
Next row: "'Louvain communities: Replayed; 12 communities, was 11.'" She stops. "Same file,
transfers-2026-04.csv, 3,093 accounts, 8,370 transfers. On the other screen it was 65, was 35.
Here it's 12, was 11. Which number do I give Priya?" After a minute: "I'm going with the one in
Version history because it shows its working. But if the real product did this I would stop
trusting any count on it." This page also says "nodes" and "edges" in Statistics where the others
say accounts and transfers. "Nodes. Right."

The Graphs list on this page stays "Transfers, March, 3,000" after the April replace finished.
"Still says March. Did it replace or not?"

**Export check.** On flows/replace-and-recipe she spots the export option "Compared with Apr 3:
each account against March data: new, in both, or no longer present. Adds the 39 no longer present
as rows. 3,132 rows." "That. That is the CSV I want. Every account, and a column saying new, in
both, gone. I'd pivot that in Excel in two minutes and my reviewer can check it." She notes she
found it on a flow chart, not on a screen she worked through, and would not have known where it
lives in the app.

She also reads, at the bottom of that flow page, a row headed "What she can say after" with
sentences like "The groups did change: the months agree less than two runs on the same month do."
"Is that what I'm supposed to say? Somebody already wrote my answer for me. Handy, but I'd rather
have that sentence in the app next to the number than in a table on a diagram."

## Her answer to the task

"Updated: April replaced March; March is kept as a version. The number of groups went from 35 to
65. Most of that isn't new rings. 26 of the 65 are single accounts that had no transfers at all in
April -- the program counts each one as its own group. Take those out and it's 39 against 35.
Of those, 26 are March groups that carried over, 13 are new, and 9 of March's are gone. And the
grouping program shuffles a bit every run even on the same month, so small changes in the count
mean nothing. What does mean something: the ring's group, Community 33, went from 22 to 32
accounts, comes out the same every run, and 7 of the new accounts took just-under-ten-grand
transfers. Two watchlist accounts, ACC-705989 and ACC-243731, are not in April at all, and 26
accounts went quiet. I'd chase those, not the 65."

Workarounds she listed:
- Added up the March legend (7 named plus "Other, 28") to get 35.
- Did the 65 = 26 + 39 / 39 - 26 = 13 / 35 - 26 = 9 arithmetic on paper; nothing states the
  gone and genuinely new groups.
- Chose the Version history numbers over the replace-and-recipe numbers by trust, not by any
  rule the tool gave her.
- Would rebuild "both months together" in Excel, because Replace drops March's transfers from
  the chart and Add is argued against.

## Single Ease Question

**4 of 7.** "Putting April in was easy -- three clicks, and the counts added up. I'd give that a 6.
Explaining the groups was a 2 or 3: the answer is on the screen, but spread over three panels, the
same few numbers mean different things, and one screen gives me completely different counts for
the same file."

## Would she use this instead of her current tool?

"For this job -- what changed between two months of the same case -- yes, over Excel, if IT
approved it. In Excel I'd VLOOKUP two account lists and still not know which clusters moved. The
What changed card, the List of the 39, and the 'new / in both / gone' export column do in a minute
what takes me an hour. The ring table with 'holds in re-runs' is the first time a grouping tool
told me which group it's sure of. But I wouldn't use it for a SAR until every screen gives the same
count for the same file, and until the groups are explained in words and not in AMI. And it's
not my call anyway. My manager picks tools."

## Findings for the studio (moderator notes, not shown to the participant)

1. Contradictory counts for the same April file across mocks: 65 communities (was 35) and 27
   components on screens/weekly-return and screens/version-history; 12 communities (was 11) and
   "unchanged: 1 component" beside "components 27" on screens/replace-and-recipe. For this
   persona, a count that disagrees with itself ends trust in every count.
2. The explanation she needed exists but is fragmented and not stated whole. No surface says
   "65 = 26 carried over + 13 new groups + 26 single dormant accounts; 9 March groups gone". The
   numbers 26 and 39 each carry two or three meanings on the same replay report (39 accounts not in
   April, 39 communities with transfers, 39 new communities; 26 carried over, 26 single, 26 with
   no transfers).
3. Replace vs Add frames the month as a snapshot to swap. An investigator's case is cumulative:
   she wanted both months together with dates, and the Add data warning argued her out of it.
4. Accounts that vanished or went quiet are presented as housekeeping ("an issue", "a component of
   its own", "just quiet") when in a mule case they are findings. The watchlist line (2 of 9
   missing) is buried in a grey paragraph in the replay report, though the Sets panel badge helps.
5. Jargon at the decision points: component, Louvain, modularity vs randomized baseline, AMI,
   Spearman, nodes/edges (on replace-and-recipe). She skipped every one and could not have
   explained AMI to her lead.
6. The Graphs list keeps the March count (3,000; "March, 3,000") in frames after April is loaded.
7. The per-account "Compared with March" export column was the most valuable thing she saw, and
   she found it only on a flow diagram.
8. Study-view leak: flows/replace-and-recipe shows a "What she can say after" row that hands the
   participant the answer to this task, and storyboards/weekly-return shows open-question notes
   under the last frame.
9. Smaller: three names for the same act (Replace data, Update with new data, Add data); two
   different versions of the update dialog (the data panel one warns about neither the 26 quiet
   accounts nor offers Add on top); "large change" with no reference for what counts as large; the
   total community count (35) never stated on the March screen; project name and dates differ
   between pages (Case 0314 today vs Payments network review May 4).
