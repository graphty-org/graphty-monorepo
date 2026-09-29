# Session: this week's export -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes metrics in NetworkX,
draws in Gephi, pastes screenshots into a monthly deck. Every refresh he redoes the Gephi half by hand.

**Task, as the moderator gave it:** "This week's export arrived. Do what you did last week, and show
your manager what changed."

**Screens used, in the order he reached them:** the load step (the "Open a graph" screen with its
open dialog, and the "Add data" dialog), the results panel (finished and out-of-date states), the
version history (current version and the older version open), and the comparison surface (two
measures, and two data versions). The mocks use a card-and-transfer network (accounts, amounts in
USD) in monthly files, March and April; the results-panel mock uses a protein network and a patent
citation network instead. Alex was told to treat the transfer files as "this week's" and "last
week's" export.

**Outcome:** finished with difficulty. He found the numbers he would give his manager, but only by
guessing at two steps the screens do not show (how to bring the new file into last week's project,
and how to start the side-by-side view), and he nearly merged the two files instead of replacing one
with the other.

## Transcript (think-aloud)

### 1. Getting the new file in

**"Open a graph" screen, with the open dialog for transfers-2026-03.csv.**

> OK, "Open a graph". Recent -- "Card and transfer transactions, February", Mar 2. So that's last
> week's project, sort of. What I want is: last week's project, with this week's file swapped in.
> I don't want to start from scratch, that's the whole point.

> There's no "replace" or "update data" anywhere on this screen. There's the recent project and
> there's "Open...". If I click Open... I get a brand new project, right? That's what this dialog
> looks like -- "Open transfers-2026-03.csv", it's asking me what every column is again.

*Reads the dialog anyway, numbers first.*

> 3,000 nodes, 9,113 edges. Sample, first 5 of 9,113 rows. OK, that I like -- I can check that
> against the row count from SQL before I do anything. That's the first thing I'd do.

> "amount as a weight means: Similarity, Distance, Capacity, Unknown." Um. It's dollars. It's
> none of those? Capacity, maybe? I don't know what picking one does. It says "Paths ignore it;
> PageRank and communities read it as a similarity" under Unknown -- so Unknown is actually
> Similarity for the stuff I use? Then why is it called Unknown. I'd leave it, because it's already
> selected and last week's numbers were done with whatever last week was.

> But I have to set this every time? Last week I set this. If this is a new project I'm redoing it.

*Decides not to use Open... and goes to the recent project instead. Inside the project he looks for
something that brings in a new file and finds "Add data" (the Add data dialog).*

> "Add data from transfers-2026-04.csv." Good, it remembered the columns -- amount is "weight:
> unknown", timestamp is the time role, I don't have to set anything. That's what I wanted.

> Accounts in the file: matched 2,961, new 132. Fine, makes sense, a few new accounts a week.

> After the merge: nodes 3,132, edges 17,483. Wait. 17,483? The export has 8,370 rows. SQL says
> 8,370. "Adds 132 nodes and 8,370 edges to 3,000 and 9,113." Oh -- it's stacking this week on top
> of last week. That's not what I want at all. That's two weeks of transfers in one graph. Every
> degree number would be roughly doubled and I'd have put that in front of my manager.

> OK, credit where it's due, the numbers on the right are what stopped me. If it had just said
> "Add data" and closed, I'd have clicked it. It's the button that's highlighted.

> So how do I *replace*? Cancel. ... I don't see it. There's no "Replace" next to "Add data". I'm
> guessing it's in some menu on the project name.

*Moderator confirms only that a replace exists; Alex does not find it on any screen. He assumes it
happened and moves on to the version history, which shows "Replace data from
transfers-2026-04.csv".*

> Right, so it exists, it's just not anywhere I looked. If I have to ask someone where "replace"
> is, I'll forget by next week.

### 2. "Do what I did last week"

**Version history, the current version selected.**

> "April data, current. Replace data from transfers-2026-04.csv." Accounts 3,093, transfers 8,370,
> found by id 2,961 of 3,000, new in April 132, not in April 39, rows dropped 0. OK -- 8,370,
> that's my number. Rows dropped zero. That's the thing I want to see first every single time.
> Good.

> "Degree and Louvain communities replayed." So it re-ran what I did last week by itself? That's
> the Gephi half, gone. If that's real, that's the thing. That's genuinely the thing.

> "65 communities, was 35." Hang on. Hang on. It went from 35 groups to 65 in one week? Is that
> the data or is that Louvain being Louvain? Last time this happened to me it was the algorithm.
> ... "seed 11". Same seed both times, it says so in the methods sentence. OK, so it's not the
> random part. So something actually changed. But nothing on this screen tells me *which* groups
> split. I can't take "65, was 35" to my manager without the next question being "which ones".

> "Modularity vs randomized baseline, 0.742 against 100 randomizations". I'll be honest, I'm not
> reading that paragraph in a meeting. But "Copy methods text" -- that I'd paste into the appendix
> slide. That's nice. That's the stuff I normally type by hand and get wrong.

*Looks at the legend on the canvas.*

> Community 1, 359. And in March -- *opens the older version* -- Community 1, 297. So community 1
> grew by about 60 accounts. ... Unless community 1 isn't the same community. Is it? It's the same
> orange. I'd assume it's the same group. I'd say "the biggest group grew".

*(Moderator note, not said to Alex: community numbers are sorted by size each run and are not
matched across versions; nothing on screen says so.)*

> And "Other, 58 communities, 2,070". So most of the picture is grey. That's the hairball again,
> just greyer.

**Results panel, out-of-date state (shown as "what it looks like when the replay can't finish on
its own").**

> "Needs action 2. Review out of date." "Re-run all." Fine -- that's one click, I like one click.
> "Betweenness and Closeness read no weight, so they stay current." I actually appreciate being told
> which ones it didn't touch. But this is a protein graph? TP53, SMAD3. I thought I was on my
> transfers. *(Moderator: that screen uses different sample data.)* OK. Makes it harder to believe
> it's the same flow.

> Counting the clicks for this week: find replace, which I couldn't; pick the file; check the
> counts; maybe Re-run all. Four, five clicks if I knew where replace was. That's fine. That's way
> better than an afternoon in Gephi.

### 3. Showing my manager what changed

> My manager wants: what's different this week, the top twenty, and why. Ideally one slide and a
> spreadsheet.

*Looks for "compare" on the version history. There isn't one. Looks at the Results list, "In this
project". Nothing says compare. The moderator opens the comparison surface.*

> I would not have found this. I don't know how I got here. Also the page says right at the top
> "Not buildable yet" -- so, is this a thing or not? *(Moderator: treat it as if it works.)*

**Comparison surface, two data versions (PageRank, March and April).**

> A March data, B April data, side by side. OK. "Spearman rank correlation 0.876, top 50 in both,
> 49 of 50." Spearman I know from stats class. 0.876, that's high, "mostly the same". 49 of the top
> 50 stayed -- that is a sentence I can say out loud to a director. "Basically the same, one new
> name in the top 50." Good.

> "Only in March, closed 39. Only in April, opened 132." Matches what the version history said.
> Good, consistent numbers across screens, that's a trust thing for me.

> Differences, "Moved": ACC-488401, from #1,575 to #88, moved 1,487. That's the story. That's the
> one account my manager asks about. I'd want to click it and see who it's sending money to.

> But -- this is PageRank. I didn't run PageRank last week. I ran degree and communities. Why is the
> comparison on PageRank? Can I compare the communities? That's the "35 to 65" thing I actually need
> to explain, and I don't see a way to put communities side by side.

> The pictures. Two hairballs of purple dots. The colour bar is purple to yellow, which I can read,
> thank god, it's not red-green. But nobody is going to learn anything from these two pictures. The
> table on the right is the useful part.

> Now, how do I get this *out*? "Save comparison", "Done". There's a three-dot menu. I don't see
> "Export" on this screen at all -- on the version history there was an Export button top right, here
> there isn't. I need the "Moved" list as a CSV, top 100, both ranks. If I can't get that into Excel
> I'm screenshotting the side panel and typing the numbers into a slide, which is exactly the thing
> I'm trying to stop doing.

> "Save comparison" -- save it where? As a file? In the project? If I save it, does it come back next
> week with the new data, or is it stuck on March and April?

> And next week: do I have to set this comparison up again? Nothing tells me it'll be there.

### After the task

**Single Ease Question (1 very hard -- 7 very easy):** 3.

> Three. The re-run part is a six, honestly, the counts and the "replayed" line are what I've wanted
> for two years. But I nearly merged two weeks of data, I couldn't find replace, I couldn't find
> compare, and I can't get the comparison into Excel. The two parts I do every week are the two
> parts I couldn't find.

**Would you use this instead of what you use now?**

> For the weekly refresh -- if replace is somewhere I can find, yes, probably. Not re-doing the
> colours and the communities every time, and it telling me rows dropped zero and 2,961 matched,
> that's the Gephi half gone. I'd still do the betweenness numbers in Python at first until I've
> checked them against NetworkX a couple of times. For the "what changed" slide, not yet. The
> comparison screen has the right numbers but I can't export them and it compares a measure I
> didn't run. And the "35 to 65 communities" -- if I show that to my manager I need to say which
> groups split, and this doesn't tell me. Also, before any of this, somebody has to tell me it's
> OK to put transfer data in it.

## What the observer saw

- The only command for bringing a new file into an existing project that Alex found was **Add
  data**, which merges. He was one click from doubling the edge count. The merged edge total (17,483
  against the 8,370 his SQL gave) is what stopped him. **Replace data** appears on no screen he was
  shown except as an entry name in version history, after the fact.
- The recent list on "Open a graph" offers last week's project but no "open with a new file"; Open...
  starts a fresh project and re-asks the column mapping and the weight question.
- The weight question's "Unknown ... read as a similarity" reads as a contradiction to him; "amount"
  in dollars fits none of the four words.
- He trusted the version history most: rows dropped, found by id, the seed in the methods sentence.
- "65 communities, was 35" alarmed him with no route to which groups split; he read "Community 1"
  in March and April as the same group because it is the same colour and the same number.
- Nothing he saw started a comparison; he reached it only with the moderator's help. The comparison
  of two data versions was on PageRank, which is not in his recipe, and offers no community
  comparison.
- The comparison screen shows no Export; he needs the Moved list as a CSV and a slide-ready picture.
  He called both canvases "hairballs" and relied only on the side panel.
- Screens drawn from different sample datasets (protein, patent citations) broke his sense that this
  was one continuous job.
