# Session: did the group really change, or did it only come out differently?

Participant: Dana Okafor, supply chain risk analyst (simulated from the supply chain analyst persona).
Moderator's task, word for word: "April's transfers replaced March's in your case project, and the
ring's group looks different now. Tell me whether the accounts really changed, or whether it only
came out differently this time."
Pages looked at, as a participant sees them (design notes hidden): the weekly return screens, the
comparison screen, the version history screen, and the compare-versions route page.
Renders: shots/record/r6-dana-rcn-weekly-return.png, shots/record/r6-dana-rcn-wr-compare-pick.png,
shots/record/r6-dana-rcn-wr-compare.png, shots/record/r6-dana-rcn-comparison.png,
shots/record/r6-dana-rcn-version-history.png, shots/record/r6-dana-rcn-compare-versions.png.

## Think-aloud

**Before starting.** "OK, so first: this is not my data. 'Case project', 'mule ring', 'transfers',
'accounts' -- this is a fraud file. I'll play along, but in my head I'm reading it as: my supplier
list went from Q1 to Q2, and the clusters the tool drew look different. Is that my suppliers, or is
it the tool? Honestly that is exactly the question I'd ask, because the thing I hate most is a
number that changes when I press the button again."

**Start screen and the reopened project.** "Recent projects, 'Case 0314, mule ring, 3,000 accounts,
edited Apr 3'. Fine, it remembered. It even says 'Selection restored, 14 nodes'. Good, I don't want
to redo Monday's setup. Top left: 'Nothing has been sent from this project'. That's the line IT
will ask me about, and I like that it's in plain sight. I'd still want someone to tell me that in
writing."

**Where would I even look?** "The task says the group looks different. My instinct is not the
algorithm list, it's 'what changed in my data'. I'll try Data." (version history screen) "Versions:
April data, current. 'What changed, against March data.' Now this I can read. 3,093 accounts, was
3,000: 2,961 in both, 132 new, 39 gone. 8,370 transfers, was 9,113. That's a reconciliation. I'd
do that with an XLOOKUP in ten minutes, but fine, it's here and it's right next to the picture."

"Then: '65 communities (was 35)', with a yellow 'large change' badge. So... the answer is yes, it
changed a lot? That's what a VP would read. But the line under it says 26 of those are single
accounts with no transfers this month. So a big chunk of the 'large change' is just 26 accounts
that went quiet and each became its own group. That's not the ring changing, that's rows with
nothing on them. The badge is shouting about something that is mostly a data artefact. I'd have
reported 'large change' upward and been wrong."

"Also -- the header on this screen says 'Payments network review', not 'Case 0314, mule ring'.
And April is dated May 4 here and 'Today 09:14' on the other screen. Is this the same project? In a
real tool that would stop me cold; I'd assume I'm looking at the wrong file."

"At the bottom of April's block there's 'Compare with...'. OK. That's probably what I want."

**The Results side, Compare with.** (compare picker screen) "The other route shows the list of
results: Degree, 'Louvain communities', 'Modularity vs randomized...'. I don't know what Louvain is.
Is it a person? A French town? If I hadn't been told 'the ring's group', I would not click that. The
little two-arrows icon on the row -- no label. I'd never have found that. I'd have used the one on
the Data page, or right-clicked."

"The picker: 'Compare Louvain communities with'. Earlier runs: 'March data, Apr 3', 35. OK, that
number matches 35 communities. Then 'Weakly connected components' and 'kind (attribute)' -- no idea,
ignoring. The grey paragraph says the runs 'keep the 5 seeded re-runs made with them (seeds 12 to
16)'. Seeds. I skip that. What I take from it: it's not going to run anything new, which is good, I
don't want to wait. I click March data."

**The comparison.** (comparison surface) "Two hairballs side by side. 'A: March', 'B: April'. Rings
on some dots, half rings on others. '300%, one camera' -- I don't know what that's telling me. The
pictures are not where I'll get the answer; I'm going to the table and the panel on the right."

"Right panel, Groups: '35 groups in March, 65 in April: 39 new, 9 lost.' And again: '26 of the new
groups are single accounts with no April transfers.' Good, it says it here too, next to the number
it explains."

"Agreement. '3 in 10 pairs of accounts that shared a group in March still share one in April.' I
had to read that twice. Pairs. OK: take two accounts that were grouped together in March; only 3 in
10 of those pairs are still together. That sounds like a lot moved."

"Then: 'two runs on March's data: 6 in 10.' Wait. Same data, run twice, and only 6 in 10 pairs stay
together? So the tool itself reshuffles 4 in 10 pairs with nothing changing? That's... that's the
thing I'm suspicious of, and it just told me so. I respect that it told me. But now I trust every
group on this screen less, not more. I would never put these groups in front of my VP."

"So how do I answer the question? If I read it like a control chart: the tool's own wobble lets 6 in
10 survive; March to April only 3 in 10 survived. 3 is well under 6, so yes, the grouping moved more
than the tool's wobble. I think that's the logic. Nothing on screen says it in one sentence -- I had
to work out that the second and third rows are the yardstick for the first. And 'two runs on
April's data: 7 to 8 in 10' -- two runs give a range? That's two numbers from one comparison?"

"'Without the 26 silent in April: 3 in 10.' Same as the headline. Then why is it there? I guess it's
saying the quiet accounts don't explain it. If so, say that."

"Now the ring. Community 33 is highlighted. Right panel: March to April 22 to 32. New in April: 7.
'Watchlist members in it: 7 of 9' -- ah, THAT's how I know it's the ring; my watchlist accounts are
in it. 'Holds in April's 5 re-runs: 1.00'. And in the table the column 'holds in April's re-runs, 0
to 1', Community 33 at 1.00, Community 25 at 0.44. I get that: this group comes out the same every
time you re-run it; group 25 is a coin toss. That column is the most useful thing on the whole page.
I want that on every ranking any tool ever gives me."

"If Community 33 hadn't been pre-selected, though, how would I find it? It's ninth in the 'Grew'
list. I'd search for a watchlist account, I suppose. I didn't see a search box on this screen apart
from 'Find a result or algorithm', which isn't what I want."

**Follow-up.** (the next screens) "Select the new ones, look at their transfers -- $9,889, $9,834,
all just under ten thousand, into one merchant. OK, even I know what that pattern is. And 'Create
set' kept the 32 as 'Ring community, April', frozen, with a note. That note is what I'd paste into
an email. Good."

**Can I get it out?** "Save comparison and Done. Where's export? The table has a '...' at the right;
I'd hope Export is in there. The PageRank comparison screen had 'Export table...' right on it; this
one doesn't. I need the table in Excel or Power BI, not a saved view I have to come back to this tool
to open."

**The route page.** (compare-versions) "This one is a page about the screens, not a screen. It says
'AMI 0.45' and '0.76'. The screen I used said '3 in 10' and '6 in 10'. If someone sends me this
page and the screen, I'd think they're different results. I don't know what AMI is and I'm not going
to find out."

## My answer to the moderator

"The ring's group really changed. It went from 22 accounts to 32, 7 of them new in April, and the
tool says it comes out the same in all 5 re-runs, so it isn't the tool shuffling. The groupings
overall moved more than the tool's own wobble -- 3 in 10 pairs kept together against 6 in 10 from
just re-running March -- but a lot of the headline 'large change', 35 to 65 groups, is 26 accounts
that simply went quiet. I'm fairly sure of the Community 33 part. The overall part I'd want someone
to check my reading of, because I had to work out myself which row was the yardstick."

## Single Ease Question

**4 of 7.** I got to an answer, but only because the ring's group was pre-selected and because I
worked out on my own that the re-run rows are the yardstick. The 'large change' badge pointed me the
wrong way first.

## Would I use this instead of my current tool?

"No -- not for this, and not instead of anything. For a start this isn't my kind of data, and the
group-finding thing reshuffles 4 in 10 pairs on the same data; I'd never show those groups to a VP.
Resilinc doesn't do groups; for a version-to-version diff of my supplier list I'd use Excel and it
would take ten minutes. What I would steal: the 'What changed against last month' list in Versions,
and the 'holds in re-runs' column. If the rankings I care about -- which supplier is the chokepoint
-- came with 'this comes out the same every time', that is the thing that would get me past my VP.
Still the same questions stand: will IT sign off, and can the table go to Power BI."

## Problems seen

1. Version history: the 'large change' badge on '65 communities (was 35)' pushes the reader to
   'yes, it changed', while most of the jump is 26 accounts with no transfers. The badge should not
   outrank its own caveat. Severity 3.
2. Comparison, Agreement: the verdict is not stated. The reader must infer that 'two runs on
   March's data' is the yardstick for the headline. One sentence ('moved more than re-running
   does') is missing. Severity 3.
3. Comparison, Agreement: revealing that re-running on the same data keeps only 6 in 10 pairs makes
   a suspicious reader distrust every group on screen; nothing says whether 6 in 10 is normal or
   bad. Severity 3.
4. Comparison, Agreement: 'without the 26 silent in April: 3 in 10' repeats the headline with no
   stated point; 'two runs on April's data: 7 to 8 in 10' gives a range for what reads as one
   comparison. Severity 2.
5. Finding the ring's group depends on it being pre-selected; no way on the comparison surface to
   look up a watchlist account or a named account. Severity 3.
6. Version history and weekly return disagree on project name ('Payments network review' vs 'Case
   0314, mule ring') and on dates (April 'May 4' vs 'Today 09:14'; March 'Apr 2' vs 'Apr 3'). Makes
   a reader think she has the wrong file. Severity 2.
7. Compare with... on the result row is an unlabelled two-arrows icon; 'Louvain communities' is a
   name a business reader would not click. The Data > Versions 'Compare with...' link is the door
   she would find. Severity 2.
8. The groups comparison has no visible 'Export table...', unlike the rankings comparison. Severity 2.
9. Jargon on the canvases: '300%, one camera', 'one domain on both sides', 'seeds 12 to 16'.
   Severity 1.
10. The route page states the statistic as 'AMI 0.45 against 0.76'; the screen says '3 in 10' and '6
    in 10'. Two numbers for one fact. Severity 2.

## What worked

- 'Nothing has been sent from this project' in plain sight on every screen.
- The Versions 'What changed against March' list reads like a reconciliation: in both, new, gone.
- The 'holds in April's re-runs' column, 0 to 1 per group: the best thing on the page.
- 'Watchlist members in it: 7 of 9' ties the abstract group back to accounts she already knows.
- The caveat about the 26 silent accounts appears next to the counts it explains.
