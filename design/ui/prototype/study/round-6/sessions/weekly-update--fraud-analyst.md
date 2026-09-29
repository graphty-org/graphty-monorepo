# Session: monthly update of the transfers project -- Sarah, fraud analyst

Participant: Sarah, level-2 financial crime investigator (study/personas/fraud-analyst.md).
Task as read to her: "Last month's transfers project needs this month's file. Update it, and
explain why the number of groups changed." Same wording as the previous round; she did this
task on the earlier mocks.
Mode: mandated. Her team lead asked for the update, so she keeps going when annoyed and lists
her workarounds instead of quitting at five minutes.
Pages worked, as the participant sees them (study view, design notes hidden): screens/weekly-return,
screens/data-panel, screens/version-history, screens/replace-and-recipe, screens/comparison.
Renders used: shots/r6-sarah-wu-weekly-return.png, shots/r6-sarah-wu-data-panel.png,
shots/r6-sarah-wu-version-history.png, shots/r6-sarah-wu-replace-and-recipe.png,
shots/r6-sarah-wu-comparison.png (full-page study renders made for this session, read in
1,300 px slices).

## Transcript (think-aloud)

**Start screen.** "Recent projects. Case 0314, mule ring, 3,000 accounts, edited Apr 3. Mine.
Click." Same confetti thumbnail. "Still don't need the picture. The date is what I check."

**The project as she left it.** "Selection restored, 14 nodes. Statistics: 3,000 accounts, 9,113
transfers, components 1, last import March data, both file names, Apr 3. Good." Legend:
"Community 1 through 7, 'Other, 28 communities', and under it 'Communities 8 to 35'. OK, so 35.
They still make me work it out from '8 to 35', but at least the top number is written down now.
Last time I added it up."

**Finding the update.** Hamburger, File. "'Update with new data... New files under this analysis;
March kept as a version. 1 slow result will wait for Re-run.' That's the one. It says update,
the task says update. Good, I don't have to translate." She notices the second item: "'Add
data... More rows on top of the data loaded now.' I still want that for the SAR -- both months on
one chart -- but the lead said update, so update."

**File picker.** "accounts-2026-04.csv and transfers-2026-04.csv, today 08:40, 3,093 and 8,370
rows, both ticked. March files there too with Apr 2 dates. 'The files are read on this computer;
nothing is sent.' That line I'd screenshot for IT." Open.

**A dialog titled "Add data: April files".** She stops. "Wait. I clicked Update. Why does this say
Add data?" She reads it anyway. "'Same columns as the data already loaded. Add data keeps March and
puts April on top: 3,132 accounts, 17,483 transfers, and the 39 accounts not in April stay in it.
To see April alone, replace March with it.' Button: 'Replace data instead'." Pause. "So now it's
called replace. Update, add, replace. If I clicked the wrong thing, it caught me, fine. But
honestly the 17,483 version is the one I'd want for the case file, with dates on the transfers, and
the tool is still talking me out of it." She clicks Replace data instead, because it matches what
she thinks she asked for.

**"Update with new data: April files".** "OK, back to update. 5 of 5 columns matched, 4 of 4.
'Every column has the name it had in March, so no binding step opens.' No import wizard. That
alone beats i2." The count table: "Accounts April 3,093, March 3,000. Found by id 2,961. New 132.
Not in April 39. With no transfers 26. Transfers 8,370 against 9,113. Same pair as March 7,576.
Rows dropped 0." She checks: "2,961 plus 132 is 3,093. 2,961 plus 39 is 3,000. Adds up." The
issue line: "'26 accounts have no transfers in April. All 26 were in March; none is new. Each will
be a component of its own.' Component again. I know from last time it means each one stands
alone. It's filed under Issues. It's not an issue, it's 26 accounts that went quiet in a mule case.
That's the first thing I'd chase." "What replays: Degree; Louvain with its 5 seeded re-runs,
seconds. Modularity versus randomized baseline, a few minutes, waits." "Not touching those words.
Load."

**After the load: the replay report.** Version history opens on the right. "April data today 09:14,
March data Apr 3. Accounts: found 2,961 of 3,000, new 132, not in April 39 with a List link, no
transfers 26 with Select. Components 1 to 27, one holds 3,067, the other 26 are the ones with no
transfers." Then Results, and she reads it twice, slowly:

"'Louvain: 35 groups in March, 65 in April: 39 new, 9 lost. 26 of the new groups are single
accounts with no April transfers. Lost, their accounts now in other groups: Communities 13, 19, 20,
21, 28, 29, 30, 32, 34.'"

"That's it. That's the sentence. 35, lose 9, that's 26 carried over. Add 39 new, 65. Of the 39 new,
26 are one dormant account each." She counts the lost list on her fingers. "Nine names. Matches."
"The only thing it doesn't say out loud is that it's 13 real new groups. 39 minus 26. I did that in
my head in a second, but when I write it up I'm going to write 13 and a reviewer will ask where 13
came from, and it isn't on the screen. Say 13."

"Sets and notes: 'Watchlist: 7 of 9 members in April; ACC-705989, ACC-243731 are not in this
data.' Still grey text at the bottom of a paragraph. Last time I said that should be at the top.
It's the most important line on the panel for me." Later she sees the Sets panel: "Watchlist,
yellow warning, 7 of 9. OK, that I'd notice. The report still buries it."

The legend under the chart after the load: "Community 1 is 359 now, was 297. 'Other, 58
communities. 19 carried on from March's 8 to 35, 39 new.' Seven plus 58 is 65, seven plus 19 is
26 carried. It matches the report. I had to add again, but it matches."

The Graphs list in the left panel on the replay frame: she does not look at it; she is reading the
right side. On the later frames it reads 3,093 accounts. "Fine."

**Statistics after the re-run.** "3,093, 8,370, components 27, isolated 26, last import April data,
today 09:14. 'Isolated 26' -- that's the plain word. Why is it 'isolated' here and 'a component of
its own' in the dialog and 'no transfers' in the report and 'silent' somewhere else? Four words,
same 26 accounts. Pick one. 'No transfers in April' is the one I'd write."

**The comparison, from the Louvain row.** "Compare with... March data, Apr 3, 35. That's the one."
Then the split view. "March on the left, April on the right, Community 33 selected: 22 in March, 32
in April." Right side: "'35 groups in March, 65 in April: 39 new, 9 lost.' Same sentence as the
report. Good, it's the same number on two screens -- that was my whole complaint last time. Matched
groups 26, new 39, lost 9, and 26 of the new are single accounts. Now it's a little table and it
adds up."

Agreement. "'3 in 10 pairs of accounts that shared a group in March still share one in April.'
Without the 26 silent: 3 in 10. Two runs on March's data: 6 in 10. Two runs on April's: 7 to 8 in 10."
Long pause. "OK. That, I can read. Last time it was 'AMI 0.45' and I couldn't have said it to
anyone. This says: run the grouping twice on the same month and only 6 in 10 pairs stay together.
So a lot of the group numbering is the program, not the customers. I can put that sentence in the
case note: 'the grouping tool does not give identical groups each run, so we compared on accounts,
not group numbers.'" Then, sharply: "But if two runs on March only agree 6 in 10, why is the tool
showing me a count of groups at all as if it's a fact? The 65 is soft. The screen should say so
next to the 65, not three sections down."

Lost groups table. "'March groups with no April match; their accounts are now in other groups.'
Community 13, 86 accounts, most now in Community 36. Community 30, 38 accounts, most now in
Community 36 too. So two March groups merged into one new April group. Community 28, 50 accounts,
now in Community 1 -- that's why Community 1 grew by 62." She nods. "This is the part I actually
needed. 'Lost' isn't lost, it's renumbered or merged. I'd rename the column to say that. 'Lost' in
my world means money you can't find."

The Grew table: "Community 33, 22 to 32, plus 10, 7 new, 'holds in April's re-runs 1.00'. The ring.
It comes out the same every run. And the side panel says Watchlist members in it: 7 of 9. All seven
of my remaining watchlist accounts are in that one group. That's the SAR, not the 65." She clicks
the row, then looks at the transfers table below: "7 selected, 26 edges. $9,889.06, $9,834.51,
$9,833.55... all just under ten grand. Structuring. Sum $228,362.79. Good, a total I can check."

She notices the note box on the set's panel is already filled in: "Community 33 grew from 22 to 32
accounts since March; 7 are new. 6 of the new ones each took about $18k to $19k..." "Who wrote
that? That's my finding, already typed. If that's supposed to be me, fine, but I didn't write it.
Also -- $18k to $19k each? The table I just read shows single transfers under $10k. Two of them
each, I suppose. If I'm putting 'about $18k' in a SAR I need to see the two rows that make it."

**The Data panel page** (screens/data-panel). "Different project name: Payments network review. One
file, transfers-2026-03.csv, grey hexagons, no colors. 'Update with new data...' button under the
columns. OK, so that's the other way in. Same words as the menu. Good." Then she reads the amount
row: "'amount, numbers, USD. Weight: amount, not used yet.' And the Overview: 'amount not used
yet'." She frowns. "Not used? Then what were March's groups built on?" She goes back to the export
text she saw on the weekly-return page: "'Louvain: weighted by amount, direction ignored, seed 11.'
And the Version history page says 'amount used as similarity'. So in March amount wasn't used, and
in April it is? If the settings changed between the months, that's a reason the groups changed and
nobody told me. Or these are just different projects. I can't tell. On a real case I'd have to
rule that out before I write a word."

**The Version history page** (screens/version-history). "Payments network review again, April data
'May 4', March data 'Apr 2'. The other screen said today 09:14 and Apr 3. Different dates for the
same files. Whatever it is, if I print both, a reviewer asks." The What changed card: "27
components (was 1), large change, 26 accounts have no transfers, Select. 65 communities (was 35),
large change, 26 are single accounts with no transfers. 3,093 accounts, 2,961 in both, 132 new,
39 not in April, List. 8,370 transfers, 7,576 in both, 794 new, 1,537 not in April. Watchlist 7 of
9. Rows dropped 0." "This card I'd paste. But the 65 line here doesn't have the '39 new, 9 lost'
the other screen has. Why is the good sentence on one page and not on this one? This is the page
called Version history -- it's exactly where I'd come back in a month to remember what happened."
"'Large change' with the yellow icon. Large compared to what? Still no answer."

The legend there: "'39 new communities numbered 36 to 74.' 36 to 74 is 39. OK."

**The replace-and-recipe page.** "Mule ring review. Another name. File, Update with new data, same
menu words." The dialog: "Update with transfers-2026-04.csv. riskScore missing, flagged now Y and N.
39 not in this file, 132 new. 3,093, 8,370, March 3,000, 9,113." Binding: "'Y is yes, N is no',
Y 14, N 3,079. Adds to 3,093. That's exactly the thing that breaks my Excel and nobody notices.
Good." Button says Replace. "Dialog says Update, button says Replace. I'll live."

After it runs: "Data updated: 4 of 5 results replayed. Graphs list: April, 3,093. Components 27,
weakly." "Last time this page said 12 communities, was 11, and 'unchanged: 1 component' next to
27. Now there's no Louvain count on this page at all, and components say 27. At least it isn't
contradicting the other page any more." Statistics still say "nodes" and "edges". "Nodes. The
other page says accounts. Same app?"

The recipe part: "Mule ring triage, from the fraud team. Watchlist 7 of 9 found, the two missing
listed in a box I can copy. Cheers, that's better than the grey sentence." She skims the rest.
"Colours from somebody else's file. Not my task. Moving on."

**The comparison page** (screens/comparison). "PageRank and betweenness. Spearman 0.40." She
scrolls. "PageRank, March and April. 49 of the top 50 in both months. That's rankings of accounts,
not groups. Doesn't answer my question." One panel at the bottom: "April data: 65 communities.
Sorted by accounts. Community 36 is third biggest." "Oh -- 36 is one of the new ones, and it's the
one Communities 13 and 30 merged into. So the biggest new group isn't new money, it's two old groups
glued together. Nice to see, but I found it by accident on a page about something else." She does
not open 'About Spearman'. "Not a word I'd use."

**Export check.** On the weekly-return page she opens Export: "PNG, 2x, copy as PNG. Methods text:
files, counts, the settings, 'graphty-element 2.0'. Tables: Nodes 157 rows, Edges 213 rows." "The
methods text goes straight into my case file, fine. But where's the per-account 'new / in both /
gone since March' column? I remember seeing it somewhere last time. Not in this dialog. Without
that I'm VLOOKUPing March against April in Excel for the reviewer anyway."

## Her answer to the task

"Updated: April's files replaced March's; March is kept as a version, and nothing was dropped at
import. The number of groups went from 35 to 65. Most of that isn't new activity: 26 of the 65 are
single accounts that had no transfers at all in April, and the tool counts each as its own group.
Take those out and it's 39 groups against 35. 26 of March's groups carried over; 9 March groups
were broken up or merged into others (two of them, 13 and 30, merged into what's now Community 36);
and there are 13 genuinely new groups. On top of that the grouping program isn't exact: two runs
on the same month only keep about 6 in 10 pairs of accounts together, so the group count moves a
bit on its own. What does matter: the ring's group, Community 33, grew from 22 to 32 accounts,
comes out the same every run, holds all 7 of our remaining watchlist accounts, and the 7 new ones
took transfers just under $10,000. Two watchlist accounts, ACC-705989 and ACC-243731, are not in
April at all, and 26 accounts went quiet. Those are what I'd chase, not the 65."

Workarounds she listed:
- Did "39 new minus 26 single = 13 real new groups" herself; the 13 is on no screen.
- Added 7 named plus "Other, 58" and 7 plus "19 carried on" on the legend to cross-check 65 and 26.
- Read "lost" as "merged or renumbered" from the lost-groups table; the column name says the
  opposite of what the table shows.
- Could not settle whether amount was used for the groups in March, because one screen says
  "amount not used yet" and the export text says "weighted by amount"; on a real case she would
  have to rule this out by hand before writing.
- Would still build both months together, and the "new / in both / gone" account list, in Excel,
  because Add data is argued against and the comparison column is not in the export she saw.

## Single Ease Question

**5 of 7.** "Up from last time. Putting April in: easy, apart from the dialog calling itself Add
data after I clicked Update. The why: this time there's one sentence that says 35, 65, 39 new, 9
lost, 26 single, and it's the same on the report and the comparison. That's most of my answer. It
loses points because I still did the 13 myself, 'lost' means merged, the good sentence is missing
from Version history where I'd look for it next month, the same 26 accounts have four names, and I
found a possible settings change between months that nothing explains."

## Would she use this instead of her current tool?

"For month-over-month on the same case, yes, over Excel, if IT approved it -- and it's my manager's
call, not mine. Excel can tell me which accounts are new and gone with a VLOOKUP. It can't tell me
that two March clusters merged into one April cluster, or that the ring's cluster is the one that
comes out the same every run. That's the part that would take me a day, and here it's a table. The
agreement line in plain words -- 6 in 10 even on the same month -- is the first time a clustering
tool has been honest with me about how soft its groups are. What keeps me from trusting it for a
SAR: every date and project name has to match across screens, the account/transfer words have to
be used everywhere, and I need the new-in-both-gone account list as a CSV. And stop filing dormant
accounts under 'Issues'. In my job they're findings."

## Findings for the studio (moderator notes, not shown to the participant)

1. The group reconciliation now works: "35 groups in March, 65 in April: 39 new, 9 lost; 26 of the
   new groups are single accounts" appears identically in the replay report and the comparison
   panel, and the legend's "19 carried on ... 39 new" agrees. The previous round's contradiction
   (65/35 on one page, 12/11 on another) is gone; replace-and-recipe no longer states a Louvain
   count. She moved from 4 to 5.
2. The last derived number is still left to the reader: 39 new minus 26 single = 13 groups with
   transfers. She computed it instantly but said a reviewer would ask where 13 came from.
3. "Lost groups" is the wrong word for what the table shows (their accounts are "now in other
   groups"; two lost groups merged into new Community 36). She read it correctly only because the
   table says where accounts went. Suggest "broken up or merged".
4. Version history's "What changed" card still reads "65 communities (was 35)" without the new /
   lost / single breakdown. It is the page she would return to later, so the sentence belongs there
   too. "Large change" still has no stated reference.
5. The same 26 accounts are named four ways: "no transfers in April" (report, card), "a component
   of its own" (update dialog, under Issues), "isolated" (Statistics), "silent" (comparison
   agreement row). She wants one plain phrase, and does not want them under Issues.
6. Possible cause of change left unexplained: data-panel shows "Weight: amount, not used yet"
   for March, while the export methods text says Louvain was "weighted by amount" and
   version-history says "amount used as similarity". She could not rule out that the grouping
   settings changed between months. If the mocks mean the same run settings, the pages should say
   so; if not, the replay report should name a settings change as a cause.
7. Naming at the entry point: choosing "Update with new data" is followed in the storyboard by a
   frame titled "Add data: April files" whose button is "Replace data instead"; the update dialog
   on replace-and-recipe ends in a "Replace" button. She followed it, but noticed each switch.
8. Watchlist loss (2 of 9) is still grey prose at the bottom of the replay report; the Sets-panel
   warning badge and the recipe binding dialog's copyable box both worked better for her.
9. Consistency across pages for the same files: project name (Case 0314 / Payments network review
   / Mule ring review), dates (April today 09:14 vs May 4; March Apr 3 vs Apr 2), and
   "accounts/transfers" vs "nodes/edges" on replace-and-recipe. For this persona a mismatch on a
   printout is a QA finding.
10. Agreement stated as "N in 10 pairs" was understood and usable in a case note, where AMI was
    not. She then asked why the 65 is shown as a fact when two same-month runs agree only 6 in 10:
    the uncertainty should sit next to the count.
11. Export: the per-account "new / in both / not in April" column she valued last round was not in
    the export dialog she met on these screens; she fell back to planning an Excel VLOOKUP.
12. Study-view leak: the ring set's note field in the storyboard is pre-filled with the finding
    ("Community 33 grew from 22 to 32 ... 6 of the new ones each took about $18k to $19k"). She
    noticed it was not hers, and its per-account totals did not match single transfers she could
    see without further rows.
13. screens/comparison is about PageRank rankings, not groups; only an incidental community table
    told her Community 36 is a merge of two March groups.
