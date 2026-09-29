# Session: this month's file into last month's project, and why the groups changed -- intelligence analyst (Marcus)

Participant: Marcus, criminal intelligence analyst at a state fusion center
(study/personas/intelligence-analyst.md). Played on a slow afternoon with no hot case behind the
task, so his patience is the ordinary kind: he pushes through because the moderator asked, not
because a sergeant is waiting.

Task as given: "Last month's transfers project needs this month's file. Update it, and explain
why the number of groups changed."

Material worked from, as the participant sees it (design notes hidden): the weekly-return
storyboard, the step-by-step weekly-return screens, the Replace data dialog and replay report
(screens/replace-and-recipe.html), the Data panel's Update with new data
(screens/data-panel.html), Data > Versions (screens/version-history.html), the replace flow
chart (flows/replace-and-recipe.html) and the comparison screen (screens/comparison.html).
Renders are in shots/, named r4-marcus-wupd-*.png. The HTML was read only to see what a tab or
button would do when clicked.

Context he brings: this is money, not phones, but it is the same job he does with bank subpoena
returns -- last month's return in a chart, this month's return just came in, and somebody wants
to know what changed. In i2 he would import the new return on top of the old chart, lose track
of who was already there, and end up doing it in Excel with a VLOOKUP.

## Think-aloud

**1. Start screen.** (r4-marcus-wupd-screens_weekly-return.png, top)

"Recent projects. 'Case 0314, mule ring. Transfers, 3,000 accounts. Edited Apr 3.' Fine, that's
last month. Three thumbnails, all of them the same gray meatball. I couldn't tell you which case
is which from the picture -- good thing the names are under them."

"No signup, no login. It opens a project off my own machine. That's the first thing I'd check."

**2. The project as I left it.**

"OK. Left side says 'Transfers, 3,000 accounts', a 'Watchlist, frozen, 9'. Right side, 14
selected, degree 7 to 12, flagged true. It even says 'Selection restored: 14 nodes'. That's the
'left it Friday, came back Monday' thing. I like that. I'll believe it when it does it with a
real case."

"Legend: 'Community color, Louvain community. Community 1, 297 ... Community 7, 120. Other, 28
communities, 1,851.' So seven named plus twenty-eight lumped is thirty-five groups. I had to
add that up myself. Louvain -- I don't know what Louvain is. I'll take it that it's the
'find the groups' button somebody ran last month."

"Over on the left rail: 'Assistant. Off. Nothing is sent.' Good. That's the first sentence IT
will ask me about."

**3. Where do I put the new file?**

"There's no Import button on the screen. Hamburger, top left. File. 'Replace data... New files
under this analysis; March kept as a version. 1 slow result will wait for Re-run.' Then 'Add
data... More rows on top of the data loaded now.'"

"Replace. That's the word that makes me nervous -- replace means March is gone. But it says
'March kept as a version' right under it, so, fine, I'll read that twice and take it. In i2 I'd
have done a Save As first and named it '_MARCH_DO_NOT_TOUCH'. Here it's telling me it does
that for me. If it's true that's worth something."

"'1 slow result will wait for Re-run.' I don't know what a slow result is yet. Moving on."

**4. The file picker.**

"'Choose files for Replace data, this computer.' Case 0314 > statements. It's already picked
the two April files -- accounts-2026-04.csv and transfers-2026-04.csv, today 08:40, 3,093 rows
and 8,370 rows. 'The files are read on this computer; nothing is sent.' That line I read word
for word. That's the line I'd screenshot for the CJIS guy."

"It picked the files for me. Nice, but I'd want to see it didn't grab the March ones by
mistake. It didn't -- March is unhighlighted. Open."

**5. The other door: if I'd clicked Add data.** (storyboard, dashed panel)

"I'd have clicked Add data, honestly, because in i2 that's what you do -- you import on top. And
it catches me: 'Same columns as ... the data already loaded. Add data keeps March and puts April
on top of it: 3,132 accounts and 17,483 transfers ... To see April alone, replace March with it.'
And the button's right there, 'Replace data instead.'"

"That's good. That is exactly the mistake I'd have made, and it told me what the mistake would
cost in numbers before I made it. Seventeen thousand transfers -- I'd have double-counted every
repeat transfer and told a sergeant the ring doubled."

**6. The load step.** (Replace data: April files)

"Files: accounts, 'nodes, CSV; 5 of 5 columns matched'. id is the key, kind, country, riskScore,
flagged. Transfers: from_account is source, to_account is target, amount, timestamp. 'Every column
has the name it had in March, so no binding step opens.' Good. I don't want to map columns again
every month."

"Nodes, edges. That's the tool talking. I'd say accounts and transfers, and the rest of the
screen does, so fine."

"Issues: '26 accounts have no transfers in April. All 26 were in March; none is new. Each will be
a component of its own.' Component of its own. OK, I think that means they'll float by
themselves. Twenty-six accounts in the account list with zero transfers -- somebody at the bank
put the whole customer list in and only this month's activity. Or the accounts went quiet. That
matters to me: quiet accounts in a mule ring is a story. Flag that."

"Counts, against March: accounts 3,093 vs 3,000. Found by id 2,961. New 132. Not in April 39.
With no transfers 26. Transfers 8,370 vs 9,113. Same pair as March 7,576. Rows dropped 0 and 0."

"Now that -- that's my Excel sheet. That's the VLOOKUP I would have spent an hour on. Found by
id, new, gone. And rows dropped zero, which is the number a defense attorney asks about. I'd
print this table."

"'What replays: Degree; Louvain with its 5 seeded re-runs -- seconds. Modularity vs randomized
baseline -- a few minutes: waits. 2 style layers, the layout, 1 set, 1 note -- carried over.'
I don't know what 'seeded re-runs' are and I don't know what 'modularity vs randomized
baseline' is. I get the gist: some of it redoes itself, one thing is slow and will wait. Load."

**7. After the load: the replay report.** (Version history panel)

"Toast: 'Data replaced: 2 of 3 results replayed. Show report.' Right panel: Version history.
April data, today 09:14. March data, Apr 3. Good, both there."

"Replay report. Accounts: found by id 2,961 of 3,000. New in April 132. Not in April 39, List.
No transfers in April 26, Select. Components: 1 to 27. One holds 3,067 accounts; the other 26
are the accounts with no transfers."

"Results: '2 replayed. Louvain, with its 5 seeded re-runs: 65 communities, was 35. 39 have
transfers; 26 are single accounts with none.'"

"There it is. That's the answer to half the question. Thirty-five groups went to sixty-five.
Twenty-six of the new ones aren't groups at all -- they're one account each, sitting alone
because they didn't move money in April. A 'group' of one. So if I'm telling the sergeant,
the honest version is: most of the jump is the method counting every idle account as its own
group."

"But wait. Sixty-five minus twenty-six is thirty-nine. March had thirty-five. So there are
four more real groups than March? Or did some of March's groups break up and new ones form?
It doesn't say. Thirty-nine. And up top, 39 is also the number of accounts not in April.
Two different thirty-nines on the same panel. I'd bet money somebody in the briefing mixes
them up. Probably me."

**8. Something off in the left panel.**

"Left panel still says 'Transfers, 3,000 accounts'. Right panel Statistics says accounts 3,093,
transfers 8,370, 'Last import: April data ... Today 09:14'. So which is it? That's the 'side
panel says 212, I count forty' thing all over again. After I loaded April, the one line that
tells me what's in the project still says March."

(The left panel keeps "3,000 accounts" in every state after the replace on the weekly-return
screens until the set is created much later, where it finally reads 3,093; on the replace
screen it reads "March, 3,000" after Apply while the right panel says April, 3,093.)

"If I screenshot that for a case file, the two numbers on the same screen disagree. I'd have to
explain that on the stand."

**9. Results panel and the slow one.**

"Results: Degree, current. Louvain communities, current, 'Replayed; 65 communities, was 35.'
Modularity vs random... Re-run, 'Out of date; a few minutes.' So I press Re-run or it runs by
itself? The storyboard shows it running with a Cancel, then 'current' at 09:02 while she's away.
Fine. I don't know what it tells me, and nobody has told me why I'd need it to answer the
question. I'd leave it."

"Statistics now: components 27, weakly. Isolated 26. 'Weakly' -- whatever. Isolated 26 I
understand. That's the same 26."

"Legend now: Community 1 359, 2 168, 3 127, 5 126, 4 111, 7 74, 6 58, Other 58 communities
2,070. Seven plus 58 is 65. Matches. But Community 5 is above Community 4 now, and Community 6
dropped from 123 to 58. So the names are sticky from March -- '26 communities keep their March
name and color by overlap' is what the report said. OK. That's actually what I want: Community
6 is still the same crew, it just lost half its people. If it had renumbered I'd be lost."

**10. Where do I see which groups changed? The comparison.**

"Storyboard says: Results panel, then the comparison surface. Two pictures side by side, 'A:
March data, B: April data'. Two hairballs. I'm not going to learn anything from two hairballs
side by side, but the table under it is the point."

"Grew / Shrank / New in April. '26 communities matched by overlap; 10 grew. Sorted by change.'
Community 1, 297 to 359, +62, 28 new. Community 27, 52 to 107, +106 percent. Community 33, 22 to
32, +45 percent, 7 new, holds in April's re-runs 1.00."

"Wait. 26 communities matched. March had 35. So nine of March's groups didn't match anything in
April. Where did they go? Did they merge into Community 1? Did they break up? That's the other
half of 'why did the number of groups change', and it's the half a case agent actually cares
about -- a crew that vanished is either a crew that got arrested, a crew that changed banks,
or a crew that merged. I click 'Shrank'."

(The Shrank and New in April tabs are drawn but carry no content; clicking them does nothing
on the mock. The storyboard never opens them either.)

"Nothing. OK, 'New in April' then. Nothing. So I've got the groups that grew and nothing on the
groups that shrank or died."

"Right side: 'Not matched. Accounts only in March 39. Accounts only in April 132. New April
communities: 39 communities, 799 accounts.' Thirty-nine again. Third different thirty-nine.
Thirty-nine new communities -- does that include the twenty-six singles? If it does, that's
13 real new groups with 773 accounts between them, which is a big deal, bigger than the singles.
If it doesn't, the math doesn't close: 26 matched plus 39 new is 65, so yes, it must include
them. So: 26 old groups carried over, 13 new real groups, 26 lone accounts, and 9 March groups
gone. I worked that out on a notepad. The tool never wrote that sentence."

"Agreement (AMI). 'March and April, on the 2,961 in both: 0.45.' 5 re-runs on March 0.76 to
0.77. 5 re-runs on April 0.81 to 0.85. '1 is the same partition, 0 is chance. Louvain is
random, so runs on the same data differ too.'"

"Point four five. Point four five of what? It says 1 is the same and 0 is chance. So March and
April are about halfway between 'same groups' and 'coin flip'? And running the thing twice on
the same data only gets you to 0.8? That is the sentence that ends my testimony. 'Detective,
your own tool says if you run it again the groups come out different.' I appreciate that it
told me. I'd rather know now than on cross. But it means I can't put 'Community 33' on a slide
as if it's a thing. I'd have to call it 'accounts that transferred heavily among themselves'
and show the transfers."

"'Holds in April's re-runs: 1.00' for Community 33. OK, now I get that column -- this group
comes out the same every time. 0.44 for Community 25 means it doesn't. That's useful. That's
the grade. That's the B2 versus the C4. Put that on the chart."

**11. The comparison screen on its own page.** (screens/comparison.html)

"This is a different project. 'Payments network review'. PageRank and betweenness scatter plot.
Then PageRank March and April. It's the same kind of month-to-month comparison but for scores,
not groups. Betweenness I know -- that's the middleman. Nice that it says 'Rank 1 is the top.'
But this isn't my task. I went looking for the groups comparison here and it isn't here."

"And the project name keeps changing on me: 'Case 0314, mule ring', 'Payments network review',
'Mule ring review'. If this were a real tool I'd think I opened the wrong case. That's a
chain-of-custody question, not a cosmetic one."

**12. Data panel and Version history, the other way in.** (screens/data-panel.html,
screens/version-history.html)

"Data tab. 'Sources: transfers-2026-03.csv, 9,113 transfers, Apr 2.' 'Update with new data...'
button under it. So it's 'Replace data' in the menu and 'Update with new data' here. Same
thing? I'd assume so. I wouldn't bet on it."

"Versions: April data, current. 'What changed, against March data. 27 components (was 1), large
change, 26 accounts have no transfers in this version, Select. 65 communities (was 35), large
change, 26 are single accounts with no transfers in this version.' 3,093 accounts (was 3,000),
2,961 in both, 132 new, 39 not in April, List. 8,370 transfers (was 9,113), 7,576 in both, 794
new, 1,537 not in April. Watchlist 7 of 9. ACC-705989 and ACC-243731 not in April. Rows dropped
at import: 0."

"This is the page I'd print. It's the version log. Every line is a count and what it's made of.
It flags 'large change' with a yellow mark on the two things that jumped. And it says the
26 singles thing again, plainly. If I only had this page, I could answer 'why did the number of
groups change' in one breath: 26 of the 30 extra are idle accounts sitting by themselves."

"But the dates don't agree. Here April is 'May 4', March is 'Apr 2'. On the other screens April
is 'today 09:14' and March is 'Apr 3'. Apr 2 is when the file came in, Apr 3 when I last worked
it? Maybe. I'd have to ask. On a discovery request, 'which date is the date' is a real question."

"Two watchlist people aren't in April. It names them. That I'd want on the first screen, not
three clicks deep. Two of my nine targets went quiet at the bank this month? That's the lede,
not the groups."

**13. The replace screen with the column that changed.** (screens/replace-and-recipe.html)

"This one is the same job, but the file's different: riskScore is now risk_score, flagged is Y
and N instead of true and false. And it asks me to bind them, and tells me what breaks if I
don't -- 'Left unbound, both switch off.' That's good. That's what happens in real life; the
bank changes its export format every other month."

"But the counts here: 'Louvain communities, 12, was 11.' On the other screen it's 65, was 35.
Same April file, same 3,093 accounts. I know these are mockups -- but if I saw two numbers for
the same run on two screens in the real thing, I'd close it."

## The answer he would give the sergeant

"We loaded April over March; March is kept as a version, and nothing was dropped. Accounts went
from 3,000 to 3,093: 132 new, 39 gone. The tool's group count went from 35 to 65, but 26 of those
are single accounts that were on the bank's list and made no transfers in April -- they're not
groups. Of the rest, 26 of March's groups carried over and mostly grew; roughly 13 new groups
formed; and nine March groups don't show up as themselves any more. I can't tell you yet
whether those nine merged, split or went quiet -- the tool didn't show me. Two of our nine
watchlist accounts aren't in April's file at all. And the grouping itself is only about halfway
stable month to month, so I'd brief the transfers, not the group numbers."

"About two-thirds of that came off the screen. The nine missing groups and the thirteen new
real ones I worked out on paper."

## Single Ease Question

**4 out of 7.**

"The loading part is a 6. Picked the right files, told me where the data goes, caught me before
I did Add instead of Replace, gave me the found / new / gone table I'd normally build in Excel.
That's better than i2 by a mile."

"The explaining part is a 3. It told me one reason -- the 26 loners -- clearly and in three
places. It did not tell me the other reason, which is that nine groups disappeared and a dozen
new ones showed up; I had to do arithmetic on three different thirty-nines to get there, and the
tab that should have shown me the shrinking groups was empty. And the left panel still said
3,000 accounts after I'd loaded 3,093."

## Would he use this instead of his current tool?

"For this -- updating a return and saying what changed -- yes, over i2 plus Excel, if IT signs
off that it runs here and nothing leaves. The version log with 'what changed' is the thing I've
wanted for ten years. I lose charts because nobody writes down what the March version was."

"Not for the groups. Not yet. I don't know what Louvain is, it tells me itself that running it
twice gives different answers, and the 'which groups went away' view isn't there. I'd use the
account and transfer counts, which I can defend line by line, and I'd keep calling the groups
'clusters the software drew', not crews."

"And it's still dots. No little bank icon, no little person. If I brief a prosecutor off this,
I'm still redrawing it in i2 afterward."

## Observed problems (moderator notes, plain)

1. After the replace, the left panel's graph row keeps the March count ("Transfers, 3,000
   accounts"; on the replace screen "March, 3,000") while Statistics shows 3,093. Two counts on
   one screen, and the stale one is the one labelled as the project's content.
2. The comparison's Shrank and New in April tabs are empty. The nine March groups with no April
   match are never listed anywhere, so half of "why the number changed" cannot be answered on
   screen.
3. No single sentence reconciles 35 to 65: 26 carried over, 13 new with transfers, 26 lone
   accounts, 9 March groups unmatched. The participant derived it by arithmetic.
4. "39" means three different things within a few inches: accounts not in April, April groups
   that have transfers, new April communities (which include the 26 lone accounts).
5. "Louvain", "seeded re-runs", "modularity vs randomized baseline", "AMI" and "weakly" are
   unexplained to someone who says "find the groups". The one plain line ("1 is the same
   partition, 0 is chance") was understood and was the most valuable -- and most alarming --
   thing on the comparison.
6. The same action is "Replace data..." in the File menu and "Update with new data..." in the
   Data panel.
7. Dates and names disagree across pages: April data "today 09:14" versus "May 4"; March "Apr 3"
   versus "Apr 2"; project "Case 0314, mule ring" / "Payments network review" / "Mule ring
   review"; communities 35 to 65 on one page and 11 to 12 on another for the same file.
8. Two watchlist accounts missing from April is buried in the replay report and Versions; for
   this participant it was more important than the group count.
9. The flow chart page has several empty rounded boxes between sections (read as placeholders
   or broken cards).

## What worked for him

- "The files are read on this computer; nothing is sent" on the picker, and "Assistant off,
  nothing is sent" on the rail.
- Add data catching the double-load and offering Replace data instead, with the cost in numbers.
- The counts table against March: found by id, new, not in April, no transfers, same pair as
  March, rows dropped.
- March kept as a version, and a Versions list whose every line is a count and its split, with
  "large change" marked.
- Group names and colors carried over from March by overlap, so Community 6 is still Community 6.
- A per-group "holds in re-runs" number he read as a reliability grade.
