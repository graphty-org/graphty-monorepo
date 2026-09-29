# This week's export -- Analyst Alex

Participant: Analyst Alex, operations data analyst (see `../../personas/analyst-alex.md`).
Task as the moderator gave it: "This week's export arrived. Do what you did last week, and show
your manager what changed."
Screens, in the order he met them: the load step (Add data with April's file), Version history,
the Results panel, and the comparison page. Renders he looked at, as a participant sees them
(design notes hidden):

- `../../../shots/r3-alex-weekly-01-load-add-data.png` -- the load step, Add data with transfers-2026-04.csv
- `../../../shots/r3-alex-weekly-05-version-history.png` -- Version history, April data open
- `../../../shots/r3-alex-weekly-08-vh-recipe.png` -- Version history, the recipe entry open
- `../../../shots/r3-alex-weekly-03-results.png` and `../../../shots/screens__results-panel--outofdate.png` -- the Results panel
- `../../../shots/r3-alex-weekly-04-comparison.png` and `../../../shots/r3-alex-weekly-06-comparison-versions.png` -- the comparison page, two measures and two data versions

Outcome: finished, with difficulty. He got the new month in without losing his styling and found
the "what changed" numbers, but could not produce the thing he actually hands his manager.
Single Ease Question: 4 of 7.

## Transcript

**Getting the new file in.**

> OK so the new export. First thing, it says "transfers-2026-04.csv". The moderator said "this
> week's" but this is a month. Whatever -- ours is weekly, I'll pretend.
>
> I didn't see how I got to this box. I'd have dragged the file on, or gone to Open. It says "Add
> data from transfers-2026-04.csv". Hm. I don't want to *add* it, I want this month instead of
> last month. If this was Gephi I'd just open a new project and redo everything, which is the
> whole problem.
>
> Oh, there's a yellow thing. "Same columns as transfers-2026-03.csv, the data already loaded."
> "Add data keeps March and puts April on top of it: 17,483 transfers." Yeah, no, that would be
> wrong -- that's double counting and I'd have shipped it. "To see April alone, replace March with
> it: 3,093 accounts, 8,370 transfers." That's what I want. Good catch, honestly.
>
> But the big blue button is still "Add data". If I'd been in a hurry I'd have hit blue. The one I
> want is the little outlined one in the middle of the yellow box. I'm clicking "Replace data
> instead".
>
> Counts. 3,093 accounts, 8,370 transfers. SQL gave me 8,370 rows, so that matches. "matched
> 2,961, new 132, not in April 39." That's nice actually -- 39 closed, 132 new -- that's the first
> thing my manager asks. I'd write that down.
>
> "amount -- weight: unknown." Wait. Last week I weighted by amount, I'm sure I did. Why is it
> unknown? Did it forget? That makes me nervous about what the rerun is going to use.

**After the replace -- did it redo last week?**

> OK, it loaded. Now what -- do I rerun everything? I'm looking for a "run last week's stuff"
> button. On the left under Styles it says "Degree size -- recipe" and "Community color -- recipe".
> I don't know what "recipe" means here but those are my two styles, so they survived. Good.
> Colours didn't vanish. That alone is better than Gephi.
>
> The legend: "Names and colors kept from March by overlap; 39 new communities numbered 36 to
> 74." OK so Community 1 is still orange, still the same group. I like that. But then -- Community
> 1, 2, 3, then 5, then 4? Why is 5 above 4? Is 5 bigger now? ... 126 versus 111, so it's sorted by
> size, not by number. Fine, but it threw me.
>
> "Other, 58 communities, 2,070." So two thirds of the graph is grey. Last month it said 35
> communities, now 65? That's a big jump. Is that real or is Louvain just being Louvain? I can't
> tell my director "the network split in two" if it's noise.
>
> And the picture is still a hairball with a few coloured dots in it. Nobody is going to look at
> that.
>
> The Results panel -- (looking at the Results mock) -- hang on, this is "Patent citations" and a
> protein thing, that's not my project. The one with the red bar says "Out of date" and "Re-run all".
> I'd expect after a replace to land on something like that for my Degree and Louvain. On my own
> project I didn't see a "you need to rerun" anywhere -- did it rerun by itself? I only found out
> in Version history.

**Version history.**

> Top right, "Version history". "April data, current, Today 09:14. Replace data from
> transfers-2026-04.csv." OK. "Degree and Louvain communities replayed: 65 communities, was 35. 26
> keep their March name and color by overlap; 39 are new." So it DID rerun them on its own. That's
> what I wanted -- but it's buried in a side panel in grey text. I'd have been sitting there
> wondering whether to click Run.
>
> "Modularity vs randomized baseline waited for Re-run and re-ran at 09:21." I have no idea what
> that sentence means. Waited for what?
>
> "Methods, one sentence per run." Actually this is good -- "Louvain ... weighted by amount ...
> seed 11 ... 65 communities, weighted modularity 0.742." So it WAS weighted by amount. Then why did
> the load box say weight unknown? Pick one. And it says seed 11, so if I rerun I get the same
> groups. That I can say out loud.
>
> The recipe entry: "Community overview, Apr 2... Community color and Degree size; Louvain
> communities and Degree, run on March data." So that's "what I did last week". OK, I get the word
> now. "Copy methods text" -- I'd paste that in the appendix.
>
> "View only" next to Full graph at the top. Why is it view only? Is it locked because I'm in
> history? Can I still change things? I'd click Done to get out and hope it goes away.
>
> "Watchlist, fixed, 7 of 9." Two of my nine watched accounts aren't there any more? Which two?
> Were they closed? It doesn't say. That's exactly the kind of thing my manager asks about and I'd
> have missed it.

**Showing the manager what changed.**

> Comparison. The first one is PageRank against betweenness -- not what I want. Second tab, "Two
> data versions": "PageRank, March and April." OK, this is the right idea. "The rankings agree at
> the top: all 10 of the top 10 are the same. Spearman 0.876." Good, I can say "the top ten didn't
> change". "only in March, closed 39; only in April, opened 132." Same numbers as the load box, so
> it's consistent.
>
> But I didn't run PageRank last week. I ran degree and communities. The "Compare with..." list
> shows "PageRank on March data", "Betweenness -- Not run", "Degree". Is that Degree on March or
> Degree on April? I can't tell. And there's nothing to compare the *communities* month to month --
> which accounts moved group. That's the actual story: 35 groups became 65.
>
> "Moved / March only / April only" tabs, and a list, "ACC-488401 #1,575 in March, #88 in April,
> moved 1,487". That's a nice line for the deck -- someone jumped fifteen hundred places.
>
> The scatter plot: tie blocks, dashed line, "947 accounts tied lowest in March". My manager is
> not reading a log-log rank scatter. I would not put this in a slide.
>
> So how do I show him? "Save comparison" -- saves it where? In this tool, which he doesn't have.
> "Export table as CSV..." -- OK, that goes to Excel, that I can use. "Export files..." up top --
> probably the picture. So I'd export the CSV, build the chart in Excel, screenshot the graph,
> paste into PowerPoint. Which is... what I do now, minus the Gephi half. That's still a win, but
> it's not "show him", it's "rebuild it for him".

## After the task

**Single Ease Question: 4.** "Getting the new month in was actually easy, it stopped me double
counting. Figuring out whether it had rerun my stuff, and then getting something my manager can
look at, that's where the time went."

**Would he use it instead of his current tool?** "For the monthly refresh -- yeah, probably,
instead of the Gephi half. It kept my colours and my groups and it reran Louvain with a seed, and
the counts match SQL. That's the part I hate doing by hand. But I'd still build the 'what changed'
slide myself in Excel, because there's nothing here I can just hand over, and there's no way to
see which accounts switched communities, which is the question. I'd still check the degree numbers
against Python the first couple of months before I trust it."

## Problems, in his words

1. **Load step, Add data:** the primary blue button is Add data even when the step itself says
   that would double the month. "If I'd been in a hurry I'd have hit blue." Severity 2.
2. **Load step, weight:** amount shows "weight: unknown", while Version history says Louvain was
   weighted by amount. "Pick one." Severity 2.
3. **After the replace:** nothing on the canvas or in Results says his runs were replayed on the
   new data; he learns it only in a grey paragraph in Version history. Severity 3.
4. **Legend:** communities sorted by size, not number (5 above 4), read at first as a ranking;
   two thirds of accounts are "Other, 58 communities", and the 35-to-65 jump has no statement of
   whether it is real change or algorithm noise. Severity 2.
5. **Version history:** "Modularity vs randomized baseline waited for Re-run" is unreadable to
   him. Severity 1.
6. **Version history, Watchlist "fixed 7 of 9":** two watched accounts are gone and nothing says
   which or why. Severity 2.
7. **Version history, "View only" chip:** unexplained; he worries he cannot edit. Severity 1.
8. **Comparison, two data versions:** only offers the measure he did not run last week (PageRank);
   no month-to-month comparison of communities; "Compare with..." does not say which month a Degree
   entry is. Severity 3.
9. **Showing the manager:** no one-step handover (slide image, summary of what changed); only
   Save comparison (inside the tool) and CSV. Severity 3.
10. **Results panel mock:** shows other projects (patent citations, proteins), not his payments
    project, so he could not tell what his own Results panel would show after the replace.
    Severity 2.
11. **No visible route** into the Add or Replace step from the project. Severity 1.
