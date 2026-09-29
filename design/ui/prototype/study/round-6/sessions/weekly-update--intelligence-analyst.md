# Monthly update: bring April's file into March's project and explain the group count

Participant: Marcus, criminal intelligence analyst at a state fusion center (i2 Analyst's Notebook
and Excel every day; not a programmer).

Task as read by the moderator: "Last month's transfers project needs this month's file. Update it,
and explain why the number of groups changed."

He did this same task in the previous round. Screens he saw: the weekly return walk-through, the
Data panel, Version history, Replace data and recipes, and the comparison page. Renders used for
this session are in `shots/r6-marcus-wu-*.png` (full pages as a participant sees them).

## Think-aloud

**Start screen, recent projects.**
"Three cards. 'Case 0314, mule ring. Transfers, 3,000 accounts. Edited Apr 3.' That's the one.
Good -- it names the case the way I'd name the folder. Clicking it."

**The project reopens.**
"'Selection restored, 14 nodes.' Fine, that's where I left it. Watchlist, frozen, 9. Left rail
says 'Assistant off. Nothing is sent.' and there's 'Nothing has been sent from this project' up
top. I read those first, every time. Okay."

"Legend: Community 1 through 7, then 'Other, 28 communities', 'Communities 8 to 35'. So 35 groups
in March. That's my before number. Writing it down."

**Looking for where to put the new file.**
"No Import button on the screen. Hamburger. File. There it is: 'Update with new data... New files
under this analysis; March kept as a version. 1 slow result will wait for Re-run.' That's the
sentence I want -- March kept. I don't want April stacked on top of March, I want April instead
of March with March still in the drawer. Clicking that."

"Right below it there's 'Add data... More rows on top of the data loaded now.' Last time I think I
went for the wrong one first. This time the top one says what it does. Fine."

**File picker.**
"Case 0314 > statements. accounts-2026-04.csv, transfers-2026-04.csv, 'today 08:40', two selected
already. 'The files are read on this computer; nothing is sent.' That's the line IT wants to see.
Open."

(Moderator note: the walk-through also shows what happens if he picks Add data by mistake. He
looked at it.)

"Oh, and if I'd hit Add data, it catches it: 'Same columns as accounts-2026-03.csv and
transfers-2026-03.csv, the data already loaded. Add data keeps March and puts April on top of it:
3,132 accounts and 17,483 transfers, and the 39 accounts not in April stay in.' And a button,
'Replace data instead.' Good. That would have double-counted every transfer. I'd have caught it
at 17,483 but maybe not until I'd briefed it."

**Update dialog, counts against March.**
"This is the part I actually like. April 3,093 accounts, March 3,000. Found by id 2,961. New 132.
Not in April 39. With no transfers 26. Transfers 8,370 against 9,113. Same pair as March 7,576.
Rows dropped zero. That's my pivot table, done for me."

"'26 accounts have no transfers in April. All 26 were in March; none is new. Each will be a
component of its own.' Okay -- so 26 accounts went quiet. That's a lead by itself. Somebody
stopped moving money. Show rows, I'd click that later."

"What replays: 'Degree; Louvain with its 5 seeded re-runs -- seconds.' 'Modularity vs randomized
baseline -- a few minutes: waits.' Louvain, I know that's the find-the-groups thing from last time.
'Seeded re-runs' I still don't know, and 'modularity versus randomized baseline' I'm not going to
pretend I know. It says it waits. Fine. Load."

**After the load: the replay report.**
"Right side, Replay report. Accounts: found by id 2,961 of 3,000. New 132. Not in April 39, List.
No transfers in April 26, Select."

"Results: '2 of 3 replayed. Louvain: 35 groups in March, 65 in April: 39 new, 9 lost. 26 of the
new groups are single accounts with no April transfers. Lost, their accounts now in other groups:
Communities 13, 19, 20, 21, 28, 29, 30, 32, 34.'"

"Okay. Let me do the math out loud because this is what the sergeant is going to ask. 35 in March.
9 of those don't exist any more -- 26 carried over. Plus 39 new is 65. And 26 of the 39 new ones
are just the 26 quiet accounts, each counted as its own group of one. So really 13 new groups that
actually move money, and 9 old groups that got swallowed into other ones. That adds up. Last time
I had to dig that out of three screens. This time it's one paragraph. I still had to do the
subtraction myself -- nobody wrote '13' anywhere -- but the pieces are all in one place."

"'Watchlist: 7 of 9 members in April; ACC-705989, ACC-243731 are not in this data.' And on the
left there's a yellow warning next to the watchlist, '7 of 9'. Good. That's more important to me
than the group count, honestly. Two of my nine targets fell out of the returns. That goes at the
top of the brief. Last round that was buried; now it's got a flag on it."

"Left panel says Transfers, 3,093 accounts. So it updated. Last time it was stuck on 3,000 and I
didn't know which number to believe."

"'1 out of date, Review.' Modularity. Re-run. It's running, 'a few minutes', there's a cancel.
I'd let that go while I get coffee."

**Comparing March and April groups.**
"Louvain communities, there's a little compare icon. 'Compare Louvain communities with... Earlier
runs: March data, Apr 3, 35.' Click."

"Now it's March on the left, April on the right, same view. Half-circles on the dots: only in
March 39, only in April 132. Okay."

"Right panel. 'Groups: 35 groups in March, 65 in April: 39 new, 9 lost. Matched groups 26, new
groups 39, lost groups (listed below) 9. 26 of the new groups are single accounts with no April
transfers.' Same story as the report. Consistent, good."

"Down at the bottom, 'Lost groups. March groups with no April match; their accounts are now in
other groups.' Community 13, 86 accounts, most now in Community 36. Community 28, 50 accounts,
most now in Community 1. Oh -- and Community 1 grew by 62. So most of Community 1's growth is
Community 28 folding into it. That's an explanation I can say out loud: 'Two crews merged, or at
least the tool thinks they did.' That list wasn't there last time. That's the half of the answer
I couldn't get before."

"The table: Grew, Shrank, New in April. Grew is up. Community 27 went from 52 to 107, doubled.
Community 33 went 22 to 32, 7 new, and 'holds in April's re-runs' 1.00. I read that last time as
the confidence grade. 1.00 is solid. Community 25 is 0.44 -- I wouldn't put that one in a brief."

(He tried to open Shrank and New in April. On this page the tabs do not switch.)

"Shrank doesn't do anything. New in April doesn't do anything. I wanted to see the 13 real new
groups, not the 26 lonely ones. So I can't list them here. Is there a way to just filter out the
groups of one?"

**The Agreement box.**
"'3 in 10 pairs of accounts that shared a group in March still share one in April, on the 2,961
accounts in both.' Three in ten. That's low. Then: 'two runs on March's data: 6 in 10.' Wait. So if
I run the thing twice on the SAME March file, only six in ten pairs end up together both times?"

"That's the part that bothers me. Half the change between March and April could just be the tool
shuffling. The number of groups went from 35 to 65 -- how much of that is the money and how much
of that is the dice? It gives me the pieces -- 3 in 10 across months, 6 in 10 on the same month --
but it doesn't say in a sentence 'some of this is the method, not the data'. If defense counsel
asks me 'would you get the same groups if you ran it again', the honest answer on this screen is
'about 6 in 10'. I need that said in plain words, next to the 35 and the 65, not in a box I have
to interpret."

"And 'without the 26 silent in April: 3 in 10.' So the quiet accounts aren't what's dragging it
down. Fine. That actually helps -- it means the reshuffle is real movement or it's the method,
not the dropouts."

**Follow-up and a note.**
"Community 33 has 7 of my 9 watchlist people in it. That's the ring. Create set, 'Ring community,
April', frozen, 32. Select the 7 new ones, the edges table shows up: from, kind, to, kind, amount.
ACC-575450 to ACC-893168, merchant, $9,889. Several of them hitting that same merchant just under
ten grand. That's structuring. That's a real finding."

"I can write a note on the set and it links to the comparison. Good. That's my 'why' written down
where the next guy finds it."

**Version history.**
"Data panel, Versions. 'April data, current. May 4, from transfers-2026-04.csv.' May 4? The picker
said today, and the report said 'today 09:14'. And 'What changed, against March data (Apr 2)' --
the card said March was edited Apr 3. Which date do I put in the case file?"

"'27 components (was 1), large change. 26 accounts have no transfers in this version.' '65
communities (was 35), large change, 26 are single accounts with no transfers in this version.'
'Watchlist: 7 of 9, ACC-705989 and ACC-243731 not in April.' Every line is a number and a split.
I like this page. This is what I'd print for the file."

"But the project on this page is called 'Payments network review'. And on the replace page it's
'Mule ring review', with a 'Mule ring' set of 14, not my watchlist of 9, and hexagons instead of
dots. Same file names, same 3,093. Is that my project or somebody else's? I'd assume it's
another case and back out."

**Data panel.**
"'Sent: nothing. The Assistant is off and no data source is connected.' Good. 'Who hosts graphty,
and where: Not decided yet.' ... Not decided yet. That's the question IT asks before anything
else. I can't put case 0314 into something where the hosting line says 'not decided'. Not a
problem with this screen -- it's honest -- but it ends the conversation at my agency until that
line says 'your department's server'."

"'Update with new data...' is the same words here as in the File menu now. Last time it was two
different names. Good."

**The PageRank comparison page.**
"This is PageRank, March against April, scatter plot. 49 of the top 50 in both months. Not my
question. The groups question was answered on the other screen. I'd skip this one."

## What he would tell the sergeant

"April return is in. 3,093 accounts, 132 new, 39 dropped out, 26 went quiet -- no transfers at
all. Two of our nine targets aren't in April's return. The tool went from 35 groups to 65. Most of
that jump is bookkeeping: the 26 quiet accounts each count as a group of one. Beyond those, 9 of
March's groups got folded into bigger ones -- Community 28 into Community 1, for instance -- and 13
genuinely new groups showed up. The ring group, Community 33, grew from 22 to 32, and six of the new
people are running just-under-ten-grand transfers through the same merchant. Caveat: the grouping
isn't very repeatable -- run it twice on the same month and only about 6 in 10 pairs land together
-- so I'd trust the group sizes less than I trust the transfer table."

## Single Ease Question

5 out of 7.

"Getting April in was easy -- two clicks and a confirm, and it told me what it was going to do
before it did it. The 'why' is mostly there now: the lost groups are listed, and the 26 single
accounts are called out. I still had to do the arithmetic for '13 real new groups' myself, I
couldn't open the Shrank or New in April lists, and the 6-in-10 repeatability number changes how
much of the answer I'd stand behind, and nothing says that in plain words. Plus three different
dates and three different project names for what I think is one case."

## Would he use this instead of his current tool?

"For this job -- the monthly refresh on a money case, and 'what changed since last month' -- yes,
over Excel. The counts table against March, the 7-of-9 watchlist flag and the version list are
things I rebuild by hand in pivot tables every month. Not instead of i2 for the chart I brief
from: it's still coloured dots, no bank icon, no person icon, and a jury doesn't get 'Community
33'. And none of it happens until the hosting line says the data stays on our server. Right now it
says 'not decided', and that's a no."

## Observed problems (moderator notes, plain)

1. No line states the reconciliation in one sentence ("26 of 35 carried over; 9 absorbed into
   other groups; 39 new, of which 26 are single silent accounts, so 13 new groups with
   transfers"). The participant derived "13" by subtraction; every piece is on screen but the
   answer is not.
2. The Agreement box shows that two runs on the same March file agree only 6 in 10, against 3 in 10
   across months, but does not say what that means for the group count. For this participant it
   changed how much of the "why" he would repeat in court. He wanted a plain sentence next to the
   35 and 65 saying part of the change may come from the method, not the data.
3. The Shrank and New in April tabs in the comparison dock could not be opened, so the 13 new
   groups with transfers could not be listed, and there is no way to hide single-account groups.
4. Dates disagree for the same event: April data "today 08:40" (file), "today 09:14" (report),
   "May 4" (Versions); March "Apr 2" (picker, Versions, replace report) versus "Apr 3" (project
   card, replay report, compare picker).
5. The same case appears under three names across the screens ("Case 0314, mule ring",
   "Payments network review", "Mule ring review"), with a different set (Mule ring, 14) and a
   hexagon drawing on the replace page. He read the replace page as a different case.
6. "Seeded re-runs" and "Modularity vs randomized baseline" remain unexplained in the update
   dialog; he let them run without knowing what they were.
7. The Data panel's hosting line reads "Not decided yet". Honest, but for an agency analyst it is
   the deciding question and it currently ends adoption.
8. Size legend reads "0 to 842" on the weekly screens and "1 to 842" in Version history.

## What worked for him

- "Update with new data..." says March is kept as a version, and the same words are used in the
  File menu and the Data panel.
- Add data catching the double-load, with the doubled totals spelled out and "Replace data
  instead".
- The counts table against March (found by id, new, not in April, no transfers, same pair, rows
  dropped) -- "my pivot table, done for me".
- The replay report's one-paragraph group summary, and the new Lost groups list with "most now
  in", which let him explain Community 1's growth by Community 28 folding into it.
- The watchlist warning ("7 of 9", the two missing ids) now flagged on the left panel, not only in
  the report.
- The graph row updating to 3,093 accounts after the replace.
- "Holds in April's re-runs" per group, read as a reliability grade.
- The frozen set plus note linked to the comparison: "my 'why' written down where the next guy
  finds it".
- Version history lines that are each a count and its split, with "large change" marked.
