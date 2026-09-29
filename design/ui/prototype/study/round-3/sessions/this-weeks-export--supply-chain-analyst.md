# Session: this week's export -- Dana Okafor, supply chain risk analyst

Participant: Dana Okafor (composite persona; see ../../personas/supply-chain-analyst.md).
Screens, in the order she met them: the load step (adding a file to a saved project), the Results
panel, the version history, the comparison of one result on two data versions.
Data on screen: the card and transfer sample (March, then April; about 3,000 accounts and 9,000
transfers) -- not her supplier data. She was told to read "accounts" as "suppliers" and "transfers"
as "what we buy from whom", and "March / April" as "last week / this week".
Renders she saw: shots/r3-dana-weekly-load-step-add-data.png (rendered for this session from the
current page), shots/screens__results-panel--outofdate.png, shots/screens__results-panel--finished.png,
shots/screens__version-history.png, shots/version-history--s2.png,
shots/r3-dana-weekly-comparison-versions.png, shots/screens__comparison-versions.png.

Moderator's task, read once: "This week's export arrived. Do what you did last week, and show your
manager what changed."

## Transcript (think-aloud)

**The saved project, then the new file.**

"OK, so last week's project is open -- 'Card and transfer transactions, March 2026', and it says
Saved. Good, it remembered. That's the first thing that has to be true or I'm not coming back on a
Monday. I'll just drag this week's file onto it. That's what I'd do with anything."

**The load step: "Add data from transfers-2026-04.csv".**

"Add data. Hm. I didn't say add. I dragged a file. Left side is the columns -- from, to, amount,
timestamp, same as last week, it's got them already. Fine, I'm not touching those."

"There's a yellow box on the right. 'Same columns as transfers-2026-03.csv, the data already
loaded.' Yes, obviously, it's the same export. The next line is long... 'Add data keeps March and
puts April on top of it' -- wait, no. No no. That would be both weeks stacked. Every total I show
would be double. That's exactly the Excel mistake where somebody pastes this week under last week
and the pivot doubles."

"And the blue button down in the corner is 'Add data'. Honestly, if I'd been in a hurry I'd have
hit the blue button. That's the button my hand goes to. The one I actually want is the little
outlined one inside the yellow box, 'Replace data instead'. It's good that it caught it. It's not
great that the big button is still the wrong one."

"I do like these numbers. 'matched 2,961, new 132, not in April 39.' That's my week in one line:
132 new suppliers, 39 dropped off. Thirty-nine dropped off is the first thing my manager asks.
Matched how, though -- by the ID column? If it's matching on names I'm in trouble, because our two
ERPs spell names differently. It doesn't say here. Later on another screen it says 'found by id',
so OK, IDs. SAP IDs I trust."

"'amount -- weight: unknown.' I don't know what that means. Amount is spend. It's not unknown, it's
dollars. I'm leaving it."

"Clicking 'Replace data instead'." (Moderator: the step becomes Replace data with the same
columns; nothing is read again.) "Fine. Though the project's still called 'March 2026' at the top.
Next week it'll still say March. I'll have to rename it every week or it'll lie to me."

**The Results panel: "do what you did last week".**

"Now -- last week I ran whatever the thing was, the ranking, and the colors. I expect it to just
do that again. I don't want to rebuild it. Where are my results... the flask icon, 'Results'. It
has a 2 on it."

"'Needs action 2. Review out of date.' Two things are out of date. OK, that makes sense, the data
changed. Clicking 'Review out of date'. 'confidence is now read as a similarity; these read it as a
distance.' I have no idea what that sentence means. Similarity, distance. I skip that. 'Re-run
all.' That's the button I want. Clicking it."

"The picture here is proteins, by the way -- TP53, MAPK1? That's not my data. And the pink bar
across the top says 'Out of date: pinned once, one verb per row, one command for all'. Is that for
me? I don't understand it. I'm going to ignore it and assume it's the demo talking to itself."

"The list on the left -- Betweenness, Closeness 'WF-corrected', Eigenvector, HITS, Katz, Girvan-
Newman... I wouldn't touch any of those. Betweenness I've heard, that's the chokepoint one. The rest
is a wall of names. I'm glad I don't have to pick from it this week -- 'In this project' up at the
top is the stuff I already ran, that's the list I care about."

**Version history: looking for "what changed".**

"Now 'show my manager what changed'. My instinct is history -- last week versus this week. There's
'Version history' on the right. 'April data, current, Today 09:14': accounts 3,093, transfers 8,370,
found by id 2,961 of 3,000, new in April 132, not in April 39, rows dropped 0."

"Honestly that block is half my answer. Rows dropped zero -- good, nothing got lost in the load. I'd
copy those five lines into an email. And 'Degree and Louvain communities replayed: 65 communities,
was 35.' 35 to 65 groups -- is that good or bad? I don't know what a community is here. I'd not
put that in front of my VP without somebody telling me what it means."

"There's a methods box, a lot of small grey text -- 'weighted by amount, direction ignored,
resolution 1, seed 11'. That's for an auditor. I'm not reading that without my glasses."

"I click 'March data' underneath. It shows March's numbers and a 'Restore version' button. I don't
want to restore it, I want to put it NEXT to April. There's no 'compare with this one' here. That's
where I expected it. I'm looking... 'Export log' at the top -- is that the comparison? Probably not,
it says log. I'd skip it."

**Finding the comparison.**

(She hunted for about a minute. The moderator did not help.) "OK, back in Results, if I click on
the ranking thing, PageRank, a panel opens, and way down under 'Appearance' there's 'Compare
with...'. Under Appearance? I'd never have looked there, I found it by clicking everything. Compare
with -- the March run of the same thing, I guess. Yes, it offers 'on March data'."

**The comparison: PageRank, March and April.**

"Right side, bold: 'The rankings agree at the top: all 10 of the top 10 are the same.' That's a
sentence. That I can use. 'Our ten most important suppliers didn't change this week.' Good. Under
it 'Spearman 0.876' -- don't know, don't care, skipping."

"'Not matched: only in March, closed 39. Only in April, opened 132.' Same numbers as the load. Now
I want the list. Which 39? That's the question -- who fell off, were any of them single-source? I
click the 39... in this mock it's just a number, I can't tell if it opens anything. If it doesn't
give me the 39 names, it's no good to me, I'd go back to a VLOOKUP between the two exports, which
is what I do today and it takes five minutes."

"'Differences -- Moved, March only, April only.' OK, so maybe 'March only' is my 39. That's a tab,
I'd click that. Moved: 'ACC-488401 #1,575= then #88, moved 1,487.' Moved in what? Moved up the
PageRank ranking. What is PageRank for a supplier? I'd have to explain it to my manager and I can't.
And what's the equals sign after 1,575? A tie? I'd just delete that in Excel."

"The chart in the middle -- rank against rank, log scale, grey dots on a diagonal, a band in the
corner. No. I'd never show that to my VP. He'd ask what the diagonal is. And the network picture
above it is the usual hairball. Pretty colours, tells me nothing."

"'Export table as CSV...' -- yes. That I'd click. It says every account with both values and both
ranks. That goes into Excel, and from there into Power BI where my VP actually looks. And 'Save
comparison' so I don't redo this next week -- good, if next week it offers me 'this week versus last
week' without clicking through Appearance again."

**Showing the manager.**

"So what do I show him. Honestly: the five lines from version history -- 132 new, 39 gone, nothing
dropped -- plus the sentence 'the top ten didn't change', plus the list of the 39 if I can get it.
None of that is on one screen. There's no 'summary of this week' I could just screenshot. I'd
build the slide myself in PowerPoint from the CSV, which is what I do now."

## After the task

**Single Ease Question: 4** (1 very hard, 7 very easy).

"The load was the best part -- it noticed the file was the same export and told me in numbers what
Add would do versus Replace. That's smarter than Excel. But the big blue button was still the wrong
one, and I only didn't fall in because I read the first line of the yellow box. Then finding 'what
changed' took me a minute of clicking; it was under Appearance, which is the last place I'd look,
and history didn't have it."

**Would she use it instead of her current tool?**

"Instead of? No. Next to Excel, maybe, for the weekly load check -- matched, new, gone, rows dropped,
done in ten seconds, and it remembered last week's setup. That I'd use. But 'what changed' for my
manager is which suppliers came and went and whether any of them is single-source, not a PageRank
ranking I can't explain. And it has to end up in Power BI. If the export gets me the list of the 39
and the 132 as a clean CSV I can load there, it has a job. Before any of that, IT asks where the
supplier file goes -- the side bar says 'Assistant off, nothing is sent', which is a start, but I'd
need that in writing for the security review, not in grey text by an icon."

## Observed

- Nearly committed Add data (both weeks stacked); saved by the warning's first line, not by the
  button layout. The primary button stayed on the wrong verb.
- Read the load counts (matched / new / not in April) as the week's headline immediately; it is
  the most valuable thing she saw.
- Expected "compare with last week" in Version history; found Compare with... only by clicking every
  control, inside a result's options under Appearance.
- Used the comparison's plain sentence; ignored Spearman, the scatter and the canvas.
- Wanted the 39 and 132 as lists of names; could not see whether the counts open anything.
- Could not explain "moved on PageRank" to a manager; read "#1,575=" as noise.
- The Results panel renders show a different dataset (proteins) and a pink frame banner that she
  read as product text.
- Complained twice about small grey text (methods box, comparison sub-lines).
