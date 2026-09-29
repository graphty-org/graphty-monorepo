# This week's export -- Analyst Alex

**Task given by the moderator:** "This week's export arrived. Do what you did last week, and show
your manager what changed."

**Participant:** Alex, operations data analyst, uses NetworkX for the numbers and Gephi for the
picture. Usual weekly routine: load the new edge list, run degree and communities, colour by
community, size by degree, paste into the deck, and write one line on what moved.

**Screens used, in order:** the load step (the open dialog and the add-data dialog), the Results
panel (a finished run, a run that is out of date), the comparison of two data versions, and version
history.

**Result:** finished, with difficulty. Single Ease Question: **4 of 7**.

---

## 1. Getting the new file in

*Looks at the start screen: "Open a graph", a Recent list, "Open...".*

> OK. Recent says "Card and transfer transactions, February". Last one I did was March, so...
> fine, whatever, I'll assume that's the project. Actually no -- if it's showing February and I
> did March last week, did it not save March? That's the first thing that makes me nervous.

*Looks at the open dialog for transfers-2026-03.csv.*

> This bit's fine, I've seen it before. Format, "each row is an edge", from and to, amount is
> money, timestamp. Sample rows. 3,000 nodes, 9,113 edges -- that's what SQL told me last time.
> Good. Still nothing on here that says whether the file goes to a server. There's a tiny
> "Assistant: off, nothing is sent" on the left edge, which -- is that about the assistant or about
> my file? I'd read it as the assistant.

*Moderator shows the dialog he gets when he picks this week's file into the open project.*

> Right, so I'm in "Card and transfer transactions, March 2026" and I've got "Add data from
> transfers-2026-04.csv". I'll be honest, I didn't see how I got here. I'd have gone to a File menu
> and looked for "Open" or "Replace" -- I don't know which button in the actual app gets me this.
> There's the hamburger at the top left, I'd guess it's in there.
>
> OK, the yellow bit: "Same columns as transfers-2026-03.csv, the data already loaded. Add data
> keeps March and puts April on top..." -- I skimmed that. The numbers I read: matched 2,961, new
> 132, not in April 39. That's actually great, that's literally the first question my manager asks,
> "how many are new, how many dropped off". I'd write those three down.
>
> Now, the big blue button says Add data. The other one is "Replace data instead". I want April to
> *be* the data, so... replace. But if I replace, is March gone? Because the entire point is to
> show what changed, and I need March to compare against. Nothing here says March is kept. In
> Gephi "replace" means it's gone. I'd hover and hope for a tooltip. If there isn't one I'd
> probably click Add data, because at least that doesn't delete anything -- and then I'd have a
> merged two-month graph with 17,483 edges, which is wrong, and I might not notice until the
> numbers look high.
>
> *(Moderator: "Suppose you choose Replace data instead.")* Fine. Replace.

*Looks at the Columns list.*

> Hang on. amount -- Role says "weight: unknown". Last week I had amount as the weight. I remember
> setting it. Why does it say unknown? Did it forget? If it forgot my weight then the communities
> won't be the same method as last week and I can't compare them. That's a "stop and check" moment
> for me. I don't know what "unknown" means here -- unknown weight, or it doesn't know what the
> weight means? Either way I don't like it.

## 2. Doing "what I did last week"

*Looks at version history after the replace (the April data entry).*

> Oh -- OK. "Degree and Louvain communities replayed." So it reran them itself. That's the bit I
> redo by hand every time in Gephi. If that actually works, that's the whole reason to switch.
>
> Counts: accounts 3,093, transfers 8,370, found by id 2,961 of 3,000, new 132, not in April 39,
> rows dropped 0. Those line up with the dialog. And -- "Louvain ... weighted by amount (larger is
> stronger) ... seed 11". So it *did* use amount as the weight. Then why did the dialog say
> unknown? Those two screens disagree and I only found out it was fine by digging into a history
> panel I'd never have opened on my own.
>
> Seed 11 shown -- good. That's the thing I get grilled on. Same seed as last time? It says seed
> 11 here; I don't remember what it was in March, and I don't see the March seed next to it.

*Looks at the Results panel (the out-of-date state, on the protein example the moderator showed).*

> This is a different dataset, the protein one, but the idea's the same, right? "Needs action 2",
> "Out of date, Re-run", a "Re-run all" button. So now I'm confused: the history said it replayed
> things automatically, this one says I have to rerun. For my transfers, which is it? If I show my
> manager degree numbers, I need to know they're April's, not March's with a new label on them.
> And the reason it gives -- "used confidence as a distance, it is now a similarity" -- I don't know
> what that means and I wouldn't want to have to.

*Looks at the canvas in version history.*

> The picture. Hairball, as usual. Legend: Community 1, 359. Community 2, 168... and "Other, 58
> communities, 2,070". So two thirds of the graph is grey. That's not a picture I can put up. And 65
> communities, "was 35". It almost doubled. Is that real or is that the algorithm? That's the first
> thing my manager would jump on and I've got nothing to tell her except a modularity number.
>
> What I do like: "Names and colors kept from March data by overlap; 39 new communities numbered 36
> to 74". So Community 1 is still Community 1. That's the thing that bit me in Gephi, colours
> reshuffling every run. If that's true, that's a big deal. Colours are fine for me by the way --
> orange, light blue, green, dark blue -- I can tell them apart, not muddy.

## 3. Showing my manager what changed

*Looks at the comparison of two data versions.*

> OK, "PageRank, March and April". I didn't run PageRank last week, I ran degree. Why is it
> PageRank? I'd want degree March versus April. I assume I can pick Degree in the list on the left
> and do the same -- there's a "Compare with..." on each result.
>
> Agreement: "Kendall tau-b 0.781". I know Spearman, sort of. Tau-b, no idea -- I'd hover the
> little i. "Spearman (ties inflate this) 0.876". I'm not putting either of those in front of my
> manager. She'd ask "is 0.78 good?" and I'm back to the modularity question.
>
> "Top 5 in both: 5 of 5". *That* I can say. "The same five accounts are still the top five."
>
> The scatter -- log scale ranks, a diagonal, grey bands for ties. It's nice, I get it after a
> minute: above the line climbed. My manager would not get it. Too much going on.
>
> Differences, Moved: ACC-488401, "#1,575=" in March, #88 in April. What's the equals sign? A tie?
> I'd guess tie. That list is exactly what I want though -- "these accounts moved the most". I'd
> want that as a table in Excel, and there's "Export table as CSV..." at the bottom. Good. That's
> the thing I'd actually send.
>
> Not matched: 39 closed, 132 opened. Same numbers as before. Consistent everywhere, which
> honestly is what makes me trust it.

*Looks for how to hand it over.*

> So what do I give her? I've got: "Save comparison" (save where? in the project? she doesn't have
> the tool), "Export table as CSV...", "Export files..." in the corner, "Export log" in version
> history, "Copy methods text". Four exports and I'm not sure which one is "a slide". I'd guess
> Export files... gives me a picture. I'd end up doing: CSV of the movers into Excel, a screenshot
> of the canvas, and paste the three numbers -- 132 new, 39 gone, same top five -- into the email.
> Copy methods text I'd keep for the appendix. That's still a slide I build by hand.

## After the task

**Single Ease Question:** 4 of 7.

> What took longest was not doing it, it was working out whether it had done it. Replace or add,
> does replace keep March, is amount still my weight, did degree rerun or do I have to press
> Re-run. Every one of those it turned out fine, but I only found out by opening version history,
> which I'd never go looking for.

**Would you use this instead of what you use now?**

> For the weekly rerun -- maybe, yes. If it really replays degree and communities on the new file
> and keeps Community 1 as Community 1, that's my whole Gephi afternoon gone, and the new/closed
> counts are exactly what I get asked. I'd still check degree against NetworkX the first couple of
> weeks before I trusted it. For the "show my manager" half, no, not yet: the comparison is built
> for someone who knows what tau-b is, and I still end up making the slide myself. And I'd need
> someone to tell me in writing the data doesn't leave my laptop before I put the real supplier
> file in.

## Problems observed

| Where | What happened | Severity (1-4) |
| --- | --- | --- |
| Add data dialog | Add data is the primary button; Replace data is secondary and says nothing about whether March is kept for comparison. Alex nearly chose Add data to avoid losing March, which would have silently stacked two months. | 3 |
| Add data dialog | amount shows "weight: unknown" although last week's run used amount as the weight (version history later confirms "weighted by amount"). The two screens disagree; trust dropped. | 3 |
| Results panel / version history | Version history says the runs replayed; the Results panel pattern says "Out of date, Re-run". Alex could not tell whether his degree numbers were April's. The out-of-date reason ("confidence as a distance ... now a similarity") was jargon to him. | 3 |
| Version history canvas | Communities went from 35 to 65 with no plain explanation, and "Other, 58 communities" covers 2,070 of 3,093 accounts, so most of the picture is grey. | 3 |
| Comparison | Shown for PageRank, which he did not run; his routine is degree and communities. There is no side-by-side of the community change. | 2 |
| Comparison | Kendall tau-b, "Spearman (ties inflate this)", the log-rank scatter with tie bands and the "#1,575=" notation are statistics he cannot repeat to a manager. | 2 |
| Handing over | Save comparison, Export table as CSV..., Export files..., Export log and Copy methods text: none is clearly "the thing for my manager"; he expects to build the slide by hand. | 3 |
| Getting the file in | No visible route from the open project to "this week's file" (he would look for File > Replace); Recent shows February when he worked on March. | 2 |
| Load dialog | No statement at the point of loading about where the file goes; "Assistant: off, nothing is sent" reads as about the assistant. | 2 |
| Version history | He would never open version history on his own, yet it was the only place that confirmed the replay, the weight and the seed. The March seed is not shown next to April's. | 2 |

## What worked for him

- matched 2,961 / new 132 / not in April 39, the same counts in the dialog, the history and the
  comparison: "consistent everywhere, which is what makes me trust it".
- Degree and communities replayed on the new file without him redoing the Gephi half.
- Community names and colours carried over from March by overlap.
- Seed and the weight are written in the methods sentence, with Copy.
- "Top 5 in both: 5 of 5" and the Moved list, with Export table as CSV.
- The community palette read clearly with his red-green colour deficiency.
