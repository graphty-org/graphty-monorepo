# Session: monthly update and "why did the groups change" -- supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst (persona: study/personas/supply-chain-analyst.md).
Task as given by the moderator: "Last month's transfers project needs this month's file. Update it,
and explain why the number of groups changed."

Screens worked through, as the participant saw them (study view, full page):
shots/record/r4-dana-wupd-screens_weekly-return.png, shots/record/r4-dana-wupd-screens_data-panel.png,
shots/record/r4-dana-wupd-screens_version-history.png, shots/record/r4-dana-wupd-screens_replace-and-recipe.png,
shots/record/r4-dana-wupd-flows_replace-and-recipe.png, shots/record/r4-dana-wupd-screens_comparison.png,
shots/record/r4-dana-wupd-storyboards_weekly-return.png.

Outcome: success with difficulty. The update itself went through first time. The explanation she
gave was partly right (26 of the new groups are single accounts with no transfers) and partly
guessed, and she stopped trusting the group count once a second screen gave a different one.

## Transcript (thinking aloud)

### Start screen

"OK, 'Recent projects'. Three cards. 'Case 0314, mule ring -- Transfers, 3,000 accounts, edited
Apr 3.' That's the only one that says transfers, so that's last month's. This isn't my kind of
data -- accounts, not suppliers -- but fine, I'll pretend an account is a supplier site. I'm
clicking the card, not 'Open...'. 'Open' would make me find the file myself."

### The project reopens

"It remembered things. There's a little black bar 'Selection restored: 14 nodes'. I didn't ask for
a selection, but OK, I suppose that's what I had last time. Right side says 14 selected, degree
7 to 12... I don't need that. Clear.

Right panel, Statistics: accounts 3,000, transfers 9,113. 'Last import: March data:
accounts-2026-03.csv, transfers-2026-03.csv. Apr 3.' Good. That's the line I actually want -- it
tells me what month I'm looking at. I'd want that at the top, not halfway down in grey.

'components: 1, weakly.' I don't know what that means. Skipping it.

The legend on the picture: 'Community color, Louvain community', Community 1 297, Community 2
182... 'Other, 28 communities, 1,851'. So these communities are the 'groups' the moderator means.
7 named plus 28 other is 35. I had to add that up myself; nowhere does it just say '35 groups'."

### Finding where to put the new file

"First thing I'd look for is 'Import' or 'Update'. Left side: Graph, Data, Notes. Top: nothing that
says import. I'd try Data first, honestly -- that's where my data is."

(On the data panel render: Sources, the CSV, its columns, and a button 'Update with new data...'.)

"'Update with new data...' -- yes, that's exactly my words. I'd click that. Good."

(On the weekly-return screen, the same thing is reached through the three-line menu: File >
'Replace data...', with the line under it 'New files under this analysis; March kept as a
version. 1 slow result will wait for Re-run'.)

"In the menu it's called 'Replace data' instead. Replace makes me nervous -- replace means March is
gone. It does say 'March kept as a version' underneath, so OK, it isn't gone. But the button on the
data side and the menu item should be called the same thing. I'd have hesitated here if I'd come
through the menu first. 'Add data...' right under it is also tempting: I AM adding April's
data. I'd have picked that, honestly, 50/50."

### Picking the files

"'Choose files for Replace data', 'this computer'. Four files: accounts-2026-04 and transfers-2026-04
from today, 3,093 and 8,370 rows, and the March ones. Both April ones are already highlighted.
'The files are read on this computer; nothing is sent.' -- that's the sentence IT is going to ask
me about. I read that one. Open."

### If I had clicked "Add data" instead

"Oh, this is nice. It caught me. 'Same columns as accounts-2026-03.csv and transfers-2026-03.csv,
the data already loaded. Add data keeps March and puts April on top of it: 3,132 accounts and
17,483 transfers ... To see April alone, replace March with it.' And a button 'Replace data
instead'. That's the mistake I'd make in Excel -- appending this month under last month and
double counting -- and it stopped me before it happened. That's worth something. 17,483 transfers
would have been an obviously wrong number, but I might not have noticed until the VP did."

### The replace dialog

"'Replace data: April files'. Left side: the two files, and the columns as little tags: id: key,
kind, country, riskScore, flagged; from_account: source, to_account: target, amount, timestamp.
'Every column has the name it had in March, so no binding step opens.' Fine -- it's telling me it
didn't have to guess. If my SAP export renamed a column (it does, every other quarter) I'd want to
see what happens then.

Right side, 'Counts, against March'. A TABLE. April and March side by side: accounts 3,093 vs
3,000, found by id 2,961, new 132, not in April 39, with no transfers 26 vs 0, transfers 8,370 vs
9,113, rows dropped 0 and 0. This is the best thing on the screen. This is my reconciliation tab,
done for me. Rows dropped zero -- that's the first thing I check in any load.

Issue: '26 accounts have no transfers in April. All 26 were in March; none is new. Each will be a
component of its own.' -- 'component of its own', I don't know what that means, but 26 accounts
with no activity this month, I understand. In my world that's a supplier we didn't buy from this
month. Normal. 'Show rows' -- I'd click that to see who they are.

'What replays': 'Degree; Louvain with its 5 seeded re-runs -- seconds'. 'Modularity vs randomized
baseline -- a few minutes: waits'. I have no idea what either of those is. I'm not touching them.
'2 style layers, the layout, 1 set, 1 note -- carried over.' Good, my setup comes with me. That
was my number one worry: redoing everything every month.

Load."

### After the load: the replay report

"'Version history' on the right: April data, today 09:14; March data, Apr 3. Good, both there.

Replay report. Accounts: found by id 2,961 of 3,000, new 132, not in April 39 'List', no transfers
in April 26 'Select'.

'Components: 1 to 27. One holds 3,067 accounts; the other 26 are the accounts with no transfers.'
OK so 'component' is: a bunch that's connected. The 26 dead accounts each count as one. Now I get
the word, three screens after it was first used.

Results: '2 replayed. Louvain, with its 5 seeded re-runs: 65 communities, was 35. 39 have
transfers; 26 are single accounts with none.'

THERE's my answer. 35 to 65. And 26 of the 65 are just those accounts that didn't do anything in
April -- each one is its own 'community' of one. So that's most of the jump and it's not real. If
you take those out it's 39 against 35.

Then 'Style layers and positions: Community color: 26 communities keep their March name and color
by overlap; 39 are new, 26 of them single accounts.'

Wait. Now 26 is the number that kept their names and 39 is the number that are new? A line ago 39
was the ones with transfers and 26 were the singles. Same two numbers, different meaning, two
lines apart. I had to read it three times. I think it works out -- 26 old groups carried over, 39
new ones, and of the new ones 26 are the singles, so 13 genuinely new groups -- but I'm doing
arithmetic on sentences in 11-point grey text. That's the part the VP would ask about and it's
buried in a paragraph.

And if only 26 of March's 35 groups carried over, where did the other 9 go? Merged? Broke up? It
doesn't say. That's actually the question behind 'why did the number of groups change'."

### The results list and the legend

"The legend now: Community 1 359, Community 2 168, ... 'Other, 58 communities, 2,070'. 7 plus 58,
65, matches. 'Size: degree, domain 0 to 842, was 1 to 907' -- zero because of those 26 dead ones,
I guess.

There's a 'Modularity vs randomized baseline' with a yellow '!' and 'Re-run' button, 'a few
minutes'. It says it waits. I would not press it. I don't know what it tells me and nobody's
said what business question it answers. It's the only yellow thing on the screen though, so it
feels like I've left something undone. That bugs me."

(She clicks Re-run anyway because the warning sign bothers her; the progress bar runs; it says
'current' afterwards. She never learns what it said.)

"I pressed it to make the yellow go away. That's not a good reason. If I'd been on the laptop in a
meeting, I would have waited 'a few minutes' for something I didn't need."

### The comparison (March vs April side by side)

"'A: March data', 'B: April data'. Two pictures of the same hairball. I don't get much from the
pictures. The right side though: 'Agreement (AMI)' 0.45. 'March and April, on the 2,961 in both
0.45'. '5 re-runs on March 0.76 to 0.77'. '1 is the same partition, 0 is chance. Louvain is
random, so runs on the same data differ too.'

Hold on. 'Louvain is random.' So if I run it twice on the SAME March file I don't get the same
groups? That's exactly the thing I don't trust. If the tool can't agree with itself, then some of
the change from 35 to 65 might be the tool and not the data. How much? It gives me 0.45 versus
0.76 -- I think that means April really is more different than a re-run would be, but I'm guessing,
and I would not say that sentence out loud in front of a VP.

The table underneath -- this I like. 'Grew', 'Shrank', 'New in April' tabs. '26 communities
matched by overlap; 10 grew. Sorted by change.' Community 1: 297 to 359, +62, +21%, 28 new.
Community 27: 52 to 107, +106%. Tables I can read. I'd click 'Shrank' next -- that's probably
where the 9 missing March groups are, or at least some of them. And 'New in April: 39 communities,
799 accounts' -- 799 accounts in brand new groups is a lot more than 132 new accounts, so a lot of
old accounts moved into new groups. That IS the story, I think: April reshuffled who belongs with
whom. The screen gives me the pieces; I had to assemble the sentence myself.

'holds in April's re-runs 0 to 1' column -- no idea. Ignoring.

Is there an export of this table? I see 'Export table as CSV...' on the other comparison page. I'd
want this exact Grew / Shrank / New table in Power BI."

### Version history in the data panel

(On the version-history render.)

"This one's actually the clearest place for my answer. Versions: April data, current. 'What changed,
against March data': '27 components (was 1) -- large change -- 26 accounts have no transfers in
this version.' '65 communities (was 35) -- large change -- 26 are single accounts with no
transfers in this version.' '3,093 accounts (was 3,000): 2,961 in both, 132 new, 39 not in April.'
'8,370 transfers (was 9,113)'. 'Rows dropped at import: 0'.

That's a change log. One line each, the old number in brackets. If I'd found this first I'd have
been done in two minutes. The '26 are single accounts' line is the whole first half of the
explanation.

But -- this says April data was loaded 'May 4'. The other screen said 'today 09:14', and March was
'Apr 3' there and 'Apr 2' here. And the size legend here says 'degree, 1 to 842' where the other
said '0 to 842'. And this project is called 'Payments network review', not 'Case 0314'. I'd assume
these are different projects. If it's the same project, the dates don't agree, and I notice
dates."

### The other replace screen

(On the replace-and-recipe render, project 'Mule ring review', same April file.)

"Same menu, Replace data. This time it shows me the mapping and a sample of the first 4 rows --
good, I like seeing actual rows. It spots that 'riskScore' is now called 'risk_score' and that
flagged is now Y/N instead of yes/no. THAT's my SAP problem. It asks me to match it, with
'matched by hand' next to the pick. Fine. 'Used by: High risk (rule set); Risk color. Left
unbound, both switch off.' Clear enough.

Then after Apply: 'Louvain communities: Replayed; 12 communities, was 11.' And 'Weakly connected
components: Replayed; unchanged: 1 component' -- while the Statistics box right under it says
'components 27, weakly'.

So now, same April file, one screen says 65 groups was 35, another says 12 was 11. And one screen
says components 27 and on the same screen the report says unchanged at 1. Which number do I trust?
This is precisely the 'same distributor entered twice and the tool called it the biggest
chokepoint' moment. If I'd seen this on my own data I would have stopped here and gone back to the
pivot table.

Also the left panel still says 'Transfers  March, 3,000' after the data was replaced with April.
On the weekly screen the left side said '3,000 accounts' after the April load too, for a while.
The right side says April, the left says March. Small, but that's the kind of thing I screenshot
and send to the vendor."

### Storyboard

"The long page with the day-by-day pictures -- Monday, Tuesday, Wednesday -- that's someone else's
week. I skimmed the headings. Too small to read, and I'm not the person in it."

### Her answer to the moderator's question

"The April file's in. The number of groups went from 35 to 65. 26 of those 65 aren't real groups:
they're accounts that had no transfers at all in April, and the tool counts each one as a group
by itself. Leave them out and it's 39 against 35. Of those 39, 26 are March groups that carried
over and 13 look genuinely new, and about 800 accounts ended up in groups that didn't exist in
March -- so accounts moved around, not just new ones coming in. Nine of March's groups don't carry
over and I couldn't see where they went; I'd look under 'Shrank'. And some of the change could be
the method itself, because it says it's random and doesn't give the same answer twice even on the
same file -- I can't tell you how much.

Also, another screen told me 12 groups, was 11, for the same file. I'd need someone to tell me
which one is right before I put either on a slide."

## Single Ease Question

"4 out of 7. Getting April's file in: 6, maybe 7 -- the counts table and the 'you're about to
double count' warning are better than what I do by hand. Explaining the change: 3. The facts are
there, but spread over three places, the same two numbers mean different things two lines apart,
and a second screen contradicts the first."

## Would she use this instead of her current tool?

"No. Not instead. The monthly reload is honestly better than my Excel reconciliation -- the April
vs March counts table, rows dropped, who's new and who's gone, the setup carried over. If I could
get that table out as a CSV into Power BI I'd use it as a side step every month. But the groups
number is the headline and I can't defend it: it's a method I can't name, it says it's random, and
two screens gave me two answers. And it still has to get past IT -- 'nothing is sent' is a good
start, they'll want it in writing -- and it isn't in Power BI, which is where my VP looks. For my
actual job I also don't know what a 'community' of suppliers would mean to the business. So: a
side tool for the reload, maybe. Not a replacement."

## Findings

Ranked most serious first. Severity: 4 = would stop her or make her distrust results, 3 = serious
delay or wrong answer, 2 = friction, 1 = cosmetic.

1. (4) Two screens report different group counts for the same April file. The weekly-return screen
   says "65 communities, was 35"; the replace-and-recipe screen says "12 communities, was 11". The
   replace-and-recipe screen also says "Weakly connected components ... unchanged: 1 component"
   while its own Statistics box says "components 27, weakly". For this participant a number that
   disagrees with itself ends trust in every number after it.
2. (3) The explanation for the change is spread over three places (replay report, comparison
   panel, version-history change log) and never stated as one sentence. The clearest version is
   in the version-history "What changed" list, which she found last.
3. (3) The replay report uses 26 and 39 in two different splits of the same 65, two lines apart
   ("39 have transfers; 26 are single accounts" then "26 communities keep their March name ... 39
   are new, 26 of them single accounts"). She had to work out 13 genuinely new groups by
   arithmetic.
4. (3) Where March's groups went is not said. 26 of 35 March groups are matched; the other 9 are
   not accounted for on any screen she read. That is the actual answer to "why did the number
   change", and it is missing.
5. (3) "Louvain is random, so runs on the same data differ too" and the AMI figures are the only
   hint of how much of the change is the method rather than the data. She did not understand the
   figures and would not repeat them to an executive; she read "random" as "untrustworthy".
6. (2) The slow result ("Modularity vs randomized baseline") carries a yellow warning and a Re-run
   button with no sentence saying what business question it answers. She ran it only to clear the
   warning.
7. (2) The same action is "Update with new data..." on the data panel and "Replace data..." in the
   File menu; "Add data..." sits next to it and matches her words for the task just as well.
8. (2) After the April load, the left panel still says "3,000 accounts" (weekly-return) or
   "March, 3,000" (replace-and-recipe) while the right panel says April, 3,093.
9. (2) Dates and ranges disagree between screens of the same story: April loaded "today 09:14"
   versus "May 4, 09:14"; March "Apr 3" versus "Apr 2"; degree legend "0 to 842" versus "1 to
   842" (the 26 accounts with no transfers have degree 0).
10. (2) Graph terms appear before any sentence explains them: "components, weakly", "Louvain",
    "seeded re-runs", "AMI", "holds in April's re-runs". "Component" becomes understandable only
    in the replay report ("One holds 3,067 accounts; the other 26 are the accounts with no
    transfers").
11. (1) The group total (35, 65) is not shown in the legend or statistics; she added "7 plus
    Other, 28" herself.

## What worked for her

- The "Counts, against March" table in the replace dialog: April and March side by side, found by
  id, new, not in April, with no transfers, rows dropped. "My reconciliation tab, done for me."
- Choosing "Add data" on a file with the same columns stops her with the merged totals and a
  "Replace data instead" button -- it caught the append-and-double-count mistake she makes in
  Excel.
- "Every column has the name it had in March, so no binding step opens" and, on the other screen,
  a renamed column (riskScore to risk_score) caught and shown with a sample of real rows.
- Style layers, layout, set and note carried over to April; March kept as a version.
- The version-history "What changed" list: one line per figure with the March value in brackets.
- The Grew / Shrank / New in April table in the comparison, sorted by change.
- "The files are read on this computer; nothing is sent" at the file picker, the sentence IT
  will ask about.
