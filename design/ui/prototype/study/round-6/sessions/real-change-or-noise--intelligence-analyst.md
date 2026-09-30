# Did the ring really change, or did it just come out differently -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (i2 Analyst's
Notebook, Excel, bank subpoena returns). Persona: study/personas/intelligence-analyst.md.

Task as the moderator read it: "April's transfers replaced March's in your case project, and the
ring's group looks different now. Tell me whether the accounts really changed, or whether it only
came out differently this time."

Screens worked: the weekly-return mocks for the case project "Case 0314, mule ring" (the replay
report, the Results list, the Compare with... picker on the Louvain result, the comparison surface,
the follow-up table of the new accounts' transfers, the note on the kept set), the Version history
panel, and the measure comparison screen. Renders as the participant saw them, design notes hidden:
shots/record/r6-marcus-rcn-weekly-return.png (frames 8 to 13 of 17), shots/record/r6-marcus-rcn-version-history.png,
shots/record/r6-marcus-rcn-comparison.png. The compare-versions flow page itself renders empty in the
participant view (shots/record/r6-marcus-rcn-compare-versions.png), so he never saw it.

## Think-aloud

**1. Where do I even start.** "OK, 'Case 0314, mule ring'. 'Nothing has been sent from this
project' -- good, keep saying that. The question is about the data changing, March to April. So the
first thing I look for is wherever it keeps track of the data. There's a Data button on the left
rail. I'll go there before I go anywhere near the 'Results'."

**2. Version history.** "Versions. 'April data, current', 'March data'. That's what I wanted: two
returns, dated, and it says which file each came from. Under April there's a 'What changed' list.

- '27 components (was 1)', with a yellow 'large change' tag. 26 accounts have no transfers.
- '65 communities (was 35)', 'large change' again. '26 are single accounts with no transfers in this
  version.'
- '3,093 accounts (was 3,000). 2,961 in both, 132 new, 39 not in April.'
- 'Watchlist: 7 of 9', two of my watchlist accounts aren't in April at all.

So right out of the gate it's waving a yellow flag at me saying the groups changed a lot. 35 to 65.
But then the same line says 26 of those are just single accounts that went quiet. So that's not
'the groups changed', that's '26 accounts sat on their hands in April and each one got its own
group'. Why flag that as a large change then? If I'm skimming I read 'large change' and tell the
sergeant the ring reorganized. That's the wrong answer and the tool handed it to me."

"And the dates don't match up with what I'll see later. Here it's 'April data, May 4' and 'March
data, Apr 2'. Hold that thought."

"There's a 'Compare with...' button down at the bottom of the April version. Compare what with
what? The whole data version? I want the ring's group, not the whole return. I'd click it anyway,
it's the only thing on this screen that says compare." (The mock does not show where it goes.)
"Nothing I can see. OK. Back out."

**3. The replay report.** "On the main screen there's a Version history panel on the right with a
'Replay report'. 'Found by id 2,961 of 3,000.' 'New accounts 132.' 'Louvain: 35 groups in March, 65
in April: 39 new, 9 lost. 26 of the new groups are single accounts with no April transfers. Lost,
their accounts now in other groups: Communities 13, 19, 20...' Fine, that's an honest paragraph.
But it's a paragraph. I read it twice. It still doesn't tell me whether MY group changed or whether
the program just shuffled."

"'Community color: the 26 matched groups keep their March name and color by overlap.' OK, so
Community 33 in April is 'the one that looks most like March's 33'. That's worth knowing. That's
also the kind of thing a defense attorney pulls on: 'looks most like' by whose count?"

**4. Finding the compare.** "Results. Degree, 'current'. Louvain communities, 'current', '65
groups'. Nothing here says compare. I'm not going to hover over every row to see what pops out."
(Moderator: he eventually rests the pointer on the Louvain row and a small icon with two arrows
appears on the right.) "There. That's a compare icon? Two arrows crossing. I would not have found
that without wiggling the mouse around. Every other button in this thing has a word on it."

**5. The picker.** "'Compare Louvain communities with'. 'Earlier runs: March data, Apr 3, 35.'
That's the one. Apr 3 -- the Version history said Apr 2. Which is it? Different screen, different
day. If I'm writing this up, the date of the run matters."

"Underneath: 'Both runs keep the 5 seeded re-runs made with them (seeds 12 to 16); the comparison
reads those and runs nothing.' Seeds. I don't know what a seed is. I get 'it ran it five more times
and kept them'. 'Runs nothing', OK, it's not going to go off and change my numbers. That part I like.
Clicked March data."

**6. The comparison.** "Two pictures side by side, March and April. Honestly the pictures are the
same hairball twice with little circles on them. 'Only on one side: only in March 39, only in April
132', and those are half-moon symbols, left half and right half. I can barely see which way the
half-moon faces on screen. On our black-and-white printer they're gone."

"Right side, this is where the answer is. 'Groups: 35 groups in March, 65 in April: 39 new, 9 lost.
26 of the new groups are single accounts with no April transfers.' Same as before."

"'Agreement. 3 in 10 pairs of accounts that shared a group in March still share one in April, on
the 2,961 accounts in both.' OK, that I can say out loud. That's plain English, not a score of 0.37.
Then: 'two runs on March's data, 6 in 10'. 'Two runs on April's data, 7 to 8 in 10.'"

"So let me get this straight. If I run the grouping twice on the SAME March return, it only agrees
with itself 6 times in 10. And March against April agrees 3 in 10. So yes, across the whole graph,
the difference is bigger than the program disagreeing with itself. The data changed more than the
dice did. Fine."

"But hold on -- it only agrees with ITSELF 6 in 10? On the same data? That's the thing I'd lose
sleep over. I'm supposed to put 'these accounts are a group' in front of a prosecutor and the
program gets a different answer four times out of ten on the whole graph. It doesn't say that as a
warning. It's just a line in a table."

"'Without the 26 silent in April, 3 in 10.' Silent. You mean no transfers. Say no transfers."

**7. Community 33.** "Which one is the ring? The table at the bottom, 'Grew', sorted by change.
Community 33, highlighted: March 22, April 32, +10, +45%, 7 new, 'holds in April's re-runs 1.00'.
On the right: 'Community 33. March to April 22 to 32. New in April 7. Watchlist members in it 7 of
9. Holds in April's 5 re-runs 1.00.' Seven of my nine watchlist accounts, the other two aren't in
the April data at all. So that's my ring."

"'Holds in April's 5 re-runs, 1.00.' One point oh of what? I think it means every time it ran it
five times, these accounts ended up together. Say 'together in 5 of 5 re-runs' then. The column
header says '0 to 1'. I'm not going to put '0.59' in a report."

"Now the arithmetic. 22 in March, 32 in April, 7 new accounts. 22 plus 7 is 29. So three more came
in from other March groups -- or more than three, if some of my March 22 left. Which ones stayed,
which ones left, which ones came over? That's the list I actually need. It's not on this screen. The
top of each picture says 'Community 33: 22 selected' on March and '32 selected' on April. If it were
the same accounts matched up, the March side would have 25 or so, not 22. So it's selecting the
group on each side, not the same people. Or it's matching people and the number is wrong. I can't
tell which."

"And it says April's re-runs hold it together. What about March? Was the March 22 solid in March,
or was that group already a coin flip? If the March group was flaky, 'grew from 22' is comparing
against a number that might have come out 18 or 28 on another day."

**8. Why it grew.** "Clicked into the 7 new ones -- the table of their transfers. From account, to
account, kind, amount, sorted by amount. ACC-575450 to ACC-893168, a merchant, $9,889.06. Another at
$9,834.51, $9,833.55, $9,813.95. Everything just under ten grand into the same merchant. Now THAT is
something I believe. That's not the grouping program, that's rows in the bank return. The inspector
says 'Louvain, March and April: only in April'. Right, they're new accounts."

**9. The note.** "Created a set, 'Ring community, April, 32, frozen'. The note it shows: 'Community
33 grew from 22 to 32 accounts since March; 7 are new. 6 of the new ones each took about $18k to
$19k from two ring accounts and passed it on to ACC-893168 (merchant) and a ring account:
pass-through.' And it links the comparison. That's the paragraph I'd write. 'Created from Community
33, Louvain on April data, in the comparison with March' -- good, that's a source line. I'd want the
file name and date of the April return right there too."

**10. The other comparison screen.** (Moderator points him at the measure comparison screen.) "This
is a different project, 'Payments network review', PageRank against betweenness, a scatter plot.
Betweenness I know, the middleman. This isn't my question. It does have a 'Not matched: in March
only 39, new in April 132' box right at the top, which the ring comparison buries in the picture
legend. That's the better place for it."

## My answer to the moderator

"Both. The accounts really changed: seven accounts that weren't in March's return at all are in the
ring's group in April, and I can show you their transfers, all just under ten grand into the same
merchant. That part is records, not the software. Whether the group's shape changed beyond that --
the three or more that moved in from other groups -- is the grouping program's call. On the whole
graph, March against April agrees less than the program agrees with itself on one month's data
(3 in 10 against 6 in 10), so the big picture did shift more than chance. This one group came out
the same in all five re-runs on April. I can't tell you whether it was that solid in March, and I
can't give you the names that joined and left from the old group without doing it by hand."

"If my director asks how sure I am: sure about the seven new accounts, fairly sure the group got
bigger, not sure enough to swear to exactly who's in it. The program only agrees with itself six
times out of ten."

## Single Ease Question

**4 of 7.** "I got to an answer, and the one line with March against a re-run of March is exactly
the thing I didn't know I needed. It loses points because the compare button is a hidden icon, the
Version history shouted 'large change' at me over 26 quiet accounts, the dates don't agree between
screens, '1.00' isn't a word, and the list I actually need -- who stayed, who left, who joined --
isn't there."

## Would I use this instead of what I use now?

"Instead of i2? No. i2 doesn't do this at all, though -- in i2 I'd put the March chart and the April
chart side by side and eyeball it, and I'd never know the grouping flips on its own. For this one
question, 'did the crew change between two returns', I'd use it beside i2 and Excel, if the
department runs it on its own server. What I'd put in the report is the seven new accounts and their
transfers. I would not put 'Community 33' in front of a jury until I can print who's in it, who
joined and where they came from, and the program can tell me it gets the same answer every time."

## Problems found

| Where | What | Severity (1 low - 4 blocks) |
|---|---|---|
| Comparison surface, Community 33 | No member-level breakdown: which March members stayed, which left, which joined from other groups. 22 + 7 new does not make 32 and nothing explains the rest | 3 |
| Comparison surface, sides | "22 selected" on March and "32 selected" on April after selecting one group: unclear whether selection is the group on each side or the same accounts by id; by id the March side should show about 25 | 3 |
| Comparison surface, Agreement | Re-running on the same March data agrees only 6 in 10, but nothing warns that the grouping itself is unstable; it reads as a quiet table row, not a caution | 3 |
| Comparison surface, Community 33 | "Holds" is given only for April's re-runs; there is no March figure, so "grew from 22" is measured against a group whose own firmness is unknown | 2 |
| Results list, Louvain row | Compare with... is an unlabeled two-arrow icon that appears only on hover; the row at rest shows "current" and nothing about comparing | 3 |
| Version history, April data | "65 communities (was 35)" carries a "large change" warning when most of the jump is 26 single accounts with no transfers; it primes the wrong conclusion | 2 |
| Version history, April data | "Compare with..." on the data version does not say what it compares (the whole version? a result?) and leads nowhere visible | 2 |
| Version history vs picker vs weekly return | March data dated Apr 2 in Version history and Apr 3 in the picker; April data May 4 in one, "today 09:14" in the other; project named "Payments network review" in one and "Case 0314, mule ring" in the other | 2 |
| Comparison surface, Community 33 and table | "1.00", "0.59", "0 to 1" for how firmly a group holds; the side panel elsewhere says "5 re-runs", so it could say "together in 5 of 5" | 2 |
| Comparison surface, drawing | Only-in-March and only-in-April marks are left and right half-moons: hard to tell apart on screen, lost on a black-and-white print | 2 |
| Comparison surface, Agreement | "Without the 26 silent in April": "silent" is jargon for "no transfers" | 1 |
| Compare with... picker | "5 seeded re-runs (seeds 12 to 16)": "seed" means nothing to him; "ran it 5 more times and kept them" is what he understood | 1 |
| Legend | "19 carried on from March's 8 to 35, 39 new" is unreadable | 1 |
| Comparison surface, Not matched | The 39 only-in-March and 132 only-in-April counts sit in the picture's legend popover; the measure comparison puts the same counts at the top of the side panel, which is easier to find | 1 |
