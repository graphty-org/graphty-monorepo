# Session: comparing March and April rings -- Sarah, fraud analyst

Task as given: "Last month you picked out rings of accounts in March's data. April's data is in
now. How much did the rings change between the two months, and which ones grew the most?"

Mode: not mandated (first-impression patience, about five minutes).
Start screen: shots/tasks/t11/01.png. Renders: tmp/round-7-sessions/t11--fraud-analyst/NN.png.
All commands were run from design/ui/prototype.

## Step 0 -- start screen (shots/tasks/t11/01.png)

"Okay. 'Transfers, March 2026' up top. The hairball again, colored by something called Louvain --
35 groups. I assume that's last month's rings; the panel on the right says 'Run from Louvain,
Sep 28'. I wouldn't have clicked 'Louvain' myself, but fine, those are my clusters. Community 1 is
297 accounts. Now where's April? I don't see April anywhere. First guess: the file name at the
top, that's usually where you open another file."

## Step 1 -- the file title menu

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/01.png task:t11 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, 'Apply recipe or style file', Version history, Close project.
No 'open' or 'load April'. 'Apply recipe' -- maybe that's how you rerun last month's steps on new
data? Not sure, and I'm not guessing on something that might repaint my case. Version history is
versions of this project, not next month's file. Let me try the Data button on the left; data is
data."

## Step 2 -- Data

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/02.png task:t11 --click "Data"

"Sources: accounts-2026-03.csv and transfers-2026-03.csv. Both March. There's a plus next to
Sources, and a filter 'amount is at least 1,000' that's on -- 812 of 3,000 accounts. Good to know,
I hope the ring numbers weren't computed on the filtered set, but I'll let that go. The picture
turned into gray hexagons, whatever. There's a dropdown on 'Transfers' next to 'Data'. Let me see
what's in it before I go hunting for an upload."

## Step 3 -- the graph dropdown

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/03.png task:t11 --click "Data" --click "Transfers"

"'Transfers, 3,000 nodes' and 'Compare graphs...'. Compare is exactly what I'm doing. Only one
graph listed though -- if April isn't loaded what's it going to compare against? Try it."

## Step 4 -- Compare graphs

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/04.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..."

"Oh. It already has 'Louvain communities, April data' on the right. So April was loaded and the
rings were already run on it -- nobody told me, and the dropdown a second ago only listed one
graph. Whatever, I'll take it.

Two hairballs side by side -- useless to me, they look identical. The right panel is what I read:

- Agreement 0.449 over 2,961 accounts in both. Says reruns of March on the same data score about
  0.76. So the grouping really did move, not just noise. I'd never put 'agreement 0.449' in a SAR,
  but the comparison to the rerun band is the bit that makes it mean something.
- March 35 groups, April 65. Matched 26 pairs. New in April: 13 groups, 773 accounts. 26 'new
  groups of one account, no transfers in April' -- those are dead accounts, not rings, fine that
  it says so. 9 gone after March.
- Size change, March to April: Community 1, 297 to 359. Community 27, 52 to 107. Community 15,
  84 to 116. Then 31 (37 to 64), 16 (81 to 102), 23 (67 to 83), 14 (84 to 98).

So 'grew the most' -- Community 1 put on the most accounts, 62. Community 27 doubled, 52 to 107,
55 more. For me 27 is the scarier one; a ring that doubles in a month is mule recruitment. The
list doesn't show the plus numbers or percent, I did that subtraction in my head. Same as I'd do
in Excel."

## Step 5 -- clicking the ring that doubled

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/05.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..." --click "Community 27"

"Row lights up and a little black box says 'Select Community 27 on both sides'. I can't see that
anything was selected on either picture -- if it picked 107 dots in that hairball I can't find
them. What I want is the list of the 55 new accounts in 27. Not here."

## Step 6 -- the 773 new accounts

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/06.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..." --click "13 (773 accounts)"

"Nothing. It's just a number. 773 accounts in brand-new groups is the headline of this whole
comparison and I can't click through to who they are."

## Step 7 -- Keep as row

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t11--fraud-analyst/07.png task:t11 --click "Data" --click "Transfers" --click "Compare graphs..." --click "Keep as row"

"'Keep as row' -- no idea what a row is, but it's the only button. 'Added Louvain: March vs April
to the Graph tree', with Undo. So it saved the comparison somewhere. Good that I don't lose it;
'Graph tree' and 'row' mean nothing to me. I didn't find a CSV of the size-change table, and I
stopped there -- I have my answer."

## Wrap-up

Did I succeed? "Yes, mostly. The rings changed a lot: about half agreement where the same month
rerun would be about three-quarters; 35 groups became 65, 26 carried over, 13 real new groups
with 773 accounts, 9 disappeared. Grew most: Community 1 by headcount (297 to 359, +62),
Community 27 by rate (52 to 107, doubled). I'd chase 27 first."

Single Ease Question: 5 out of 7. "Once I found Compare it was all on one screen. Finding it took
a guess -- it hides in a dropdown under Data, not on the file menu where I went first, and the
dropdown didn't even list April."

Would I use this instead of my current tool? "For this question, maybe. Doing month-over-month
cluster matching in Excel is a pivot plus a VLOOKUP on account IDs, and the matching of 'which
April group is last month's group 27' is the part that's a pain by hand -- this did it. But I
can't click through to the new accounts, I didn't see a CSV of the change table, and the two
pictures told me nothing. So: it answers the manager's 'how much changed' question, then I'm back
in Excel for the actual case work."

## Problems seen

1. April data was already loaded and run, but nothing on the start screen or in the graph
   dropdown said so; I only found it by opening Compare. (moderate)
2. Compare is only reachable from a dropdown under Data; I looked in the file menu first. (moderate)
3. Size-change list shows "297 to 359" but no change column (+62, +106%); I did the arithmetic.
   It also does not say how it is sorted. (minor)
4. Clicking a ring in the size-change list gave no visible selection on either picture. (moderate)
5. "13 (773 accounts)" new in April is not clickable -- no way to get the list of new accounts.
   (serious for my job)
6. The side-by-side pictures are two indistinguishable hairballs. (minor)
7. "Keep as row" and "Graph tree" are meaningless words to me; no CSV export of the table seen.
   (moderate)
8. Unclear whether the 1,000-minimum amount filter shown under Data affected the ring numbers.
   (minor, but an examiner would ask)
