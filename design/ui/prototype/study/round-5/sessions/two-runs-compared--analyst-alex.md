# Two rankings of the same characters, compared -- Analyst Alex

**Participant:** Alex, operations data analyst. Uses NetworkX for the numbers and Gephi for the
picture. Knows betweenness well enough to run it, not well enough to derive it.

**Task, as the moderator gave it:** "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

**Screens used:** the navigation mock (Les Miserables project, at rest and with the project menu
open), the results panel (finished, filtered, running with an edit held, out of date, a node
selected), run and read, the comparison surface, the table dock, the inspector (a result selected).
Only some of these show Les Miserables; the rest show protein or payments data, and Alex was told to
read them as if they were his project.

**Outcome:** finished, with difficulty. He found yesterday's ranking, changed one option, reran it
and reached a comparison he would paste into an email. He had to guess three times along the way.
The biggest guess -- whether the weight is read as "stronger" or "longer" -- is one he says he would
check in Python before sending anything.

---

## 1. Finding yesterday's ranking

*Opens the Les Miserables project, as it looks at rest.*

> OK, Les Miserables, 77 nodes, 254 edges, one component. That matches what I remember, fine.
> Yesterday I ranked them... I think I did betweenness. Where's yesterday's stuff?

*Looks at the right-hand panel: Overview, Style stack, Results.*

> Results says "Bridges, done". That's it. That's not what I ran. Or -- is it? I don't know what
> "Bridges" is. I ranked the characters. Where's the ranking?

*Looks down at the table under the graph: label, group, degree.*

> The table's sorted by degree. Valjean 36, Gavroche 22, Marius 19. So maybe yesterday was degree?
> Degree's also a ranking. Honestly I don't remember which one I did, and nothing here says
> "yesterday". Nothing has a date on it.

*Switches to the table view that shows both a degree column and a betweenness column for Les
Miserables.*

> OK here -- "Betweenness exact, unweighted, full graph" sitting over the betweenness column. That's
> it. That header is actually nice, it says how it was made right on the column. Valjean 0.570,
> Gavroche 0.165, Marius 0.132. And there's a line: "Valjean is #1 on both measures. At #2 they
> part: Gavroche by degree, Myriel by betweenness." Huh. Myriel. OK.

> But I got here from the table, not from anything called "yesterday" or "history". If I had two
> projects open I'd not be sure which one I'd worked in.

*Opens the project menu: Export, Update with new data, Download project file, Version history,
Project info, Rename, Duplicate, Close.*

> "Version history" -- maybe that's where yesterday is. I'm not going to go in there though; I just
> want the ranking I made, not a restore point. Moving on.

**What took longest:** working out which of yesterday's results was "the ranking". The Results list
showed one entry he did not recognise, and runs carry no date.

## 2. Deciding what "one thing changed" means

> She said "one thing changed". The obvious one is weight. The edges have a value -- how many
> scenes two characters share, I think. Yesterday was unweighted, the column literally says so.
> So: same betweenness, but weighted by how often they appear together. That's the thing a director
> would ask. "Does Valjean still come out top if you count how much they're together, not just
> whether?"

*Opens the Les Miserables betweenness result (the filtered state is the only one that shows Les
Miserables in the result panel).*

> "on: filtered graph, 60 nodes, 1 component". Wait, filtered? Yesterday was the full graph per the
> table. This one's been filtered to degree 2 or more. OK -- ignore that, I'd clear the filter first.
> Actually that's a second thing that could be different between runs, and I'd better not change two
> things. Good that it says it right at the top, I'd have missed it otherwise.

> "Weight: value, not used yet. Change..." -- there it is. "value" is the column. "Not used yet".
> OK.

*Scrolls down the same panel.*

> And down here under Options: "Weight: None for this run". So there are two weight things? One up
> top that says "Change..." and one down here in Options with a dropdown. Which one do I touch? If I
> hit "Change..." up top, does it change it for everything in the project? I don't want to break
> yesterday's run, I want a second one next to it.

*Looks at the out-of-date state on the protein project, where changing how the weight is read
marked two other results out of date with a "Re-run all" button.*

> Yeah -- see, that's what I was worried about. Change the weight "up there" and other stuff goes
> yellow and wants re-running. If I press "Re-run all" do I lose yesterday's numbers? It says
> Betweenness "did not use the weight, so they stay current" -- OK, so that one's safe this time. But
> I'd be nervous.

> I'm going with the one in Options, because it says "for this run". That sounds like it only
> touches this run.

**Guess 1:** that the Options dropdown changes only the new run and the "Change..." link changes
the whole project. Nothing on screen confirms either.

## 3. How is the weight read

*Clicks the Options dropdown in his head; the mocks show "No numeric edge column" on another graph
and "None for this run" here, never the list open on Les Miserables.*

> I pick "value". Now -- hang on. In NetworkX when you pass a weight to betweenness it's a distance.
> I always forget which way round. More scenes together should mean *closer*, not further. If it
> treats 9 scenes as a longer road than 1 scene, the ranking's backwards and I won't notice because
> it'll still look like a ranking.

*Looks for anything saying which way the weight is read. Finds, on the protein Louvain result,
"used as similarity: higher = stronger link", and in the out-of-date notice "used confidence as a
distance. It is now used as similarity".*

> So it knows the difference. It says "similarity" or "distance" somewhere. But I only see that
> wording on other results, after the fact. When I pick "value" for betweenness, does it ask me? I
> can't tell from this. I'd want it to say, right when I pick it, "more = closer" or "more =
> further", in those words.

**Guess 2:** that choosing "value" will read more shared scenes as a stronger tie. He says he would
check the top five against NetworkX before trusting it.

## 4. Running it

*Looks at the running state (PageRank on the patents graph, with an option held for the next run).*

> OK so if I change an option while it's... no, it's not running, it's Les Mis, it'll take a tenth
> of a second. Whatever. I change the weight, press Run. It says "Options wait for Run" -- good, it
> doesn't just go off by itself.

> And "Runs 2. Run 2 running, 62%. Run 1 damping 0.85 shown." Right, so it keeps the first run.
> Good. That's the thing I need -- two runs, not one run overwritten. Gephi would just overwrite the
> column.

> But look, on the other results the runs just say "Run 1, 1.2 s, shown". The time it took. I don't
> care how long it took. I care what was different. "Run 1: unweighted. Run 2: weighted by value."
> That's the label I'd want. In that one screen it does say "damping 0.85" -- so sometimes it names
> the setting and sometimes it names the time?

**What took longest:** telling the two runs apart. He expected each run to be named by the setting
that differs.

## 5. Comparing the two

*Presses "Compare with..." under Runs. Looks at the picker on the comparison screen: "Compare
PageRank with: PageRank on March data, Betweenness (Not run), Degree", with a search box "Find a
result or run".*

> "Find a result or run". OK so I'd expect "Betweenness, run 1" in that list. The example has
> "PageRank on March data", which is the same measure on different data, so I guess my earlier run
> would show up the same way. I'd click it.

**Guess 3:** that his earlier run of the same measure appears in the picker. The example shows two
datasets or two measures, never two runs of one measure on one graph.

*Reads the comparison surface as if it were Les Miserables.*

> OK this I like. Top right: both things, each with how it was made. "Unweighted, directed. Details."
> For me it'd be "Unweighted" and "Weighted by value". That's the "how each was made" part, done,
> sort of.

> "Agreement: 49 of the top 50 in both. The rankings mostly agree at the top." -- that is a sentence
> I can put in an email. For Les Mis I'd set top to 10 or 20, not 50, there's only 77 of them.
> Buttons for 5, 10, 20, 50, 100. Fine.

> Spearman 0.76 -- I know roughly what Spearman is, higher is more alike. "About Spearman" says
> 1 is same order, 0 unrelated. And it leaves out the ones tied at zero, with the number counting
> them in brackets. That matters for Les Mis, like half of them are 0 on betweenness. Good that it
> says.

> Then the list on the right: "Moved", "March only", "April only" -- for me it'd be "Moved" and
> nothing else, same characters both times. The one who moved the most, at the top. "#1,575= to #88,
> moved 1,487". That's exactly the question she's asking: who went up, who went down.

> The scatter, rank against rank... I'd not paste that for a director. I'd paste the moved list.
> "Export table as CSV" is right there. OK. Excel. Good.

> "PageRank gives the same result every run, so a re-run cannot tell change from noise." Useful.
> Betweenness is exact too, so same thing -- the differences are the weight, not randomness. I'd
> want it to say that for betweenness as well.

## 6. "How each was made", for the colleague

*Opens "Details" on one side; finds the run record on the Les Miserables betweenness result:
Method, Seed, Damping, Normalization, Weight conversion, Scope, Engine, with a Copy button.*

> "Brandes betweenness, exact: every node is a source. Normalization: divided by (n-1)(n-2)/2.
> Weight conversion: None, value not used. Scope: filtered graph, 60 of 77, after Filter to degree
> >= 2." Yes. This is it. I'd hit Copy on each and paste both into the email.

> Though -- two Copies, two pastes. On the comparison itself I'd want one Copy that gives me both
> records and the agreement line together. That's what she asked for, in one go.

> And the weight conversion line is where the "stronger or longer" thing would finally be written
> down. For run 2 I'd look there first. If it says "value used as distance", I'd throw the run away.

## 7. Saving it

*Presses "Save comparison". Sees it appear under "In this project" as "PageRank and betweenness".*

> It names itself after the two things. Mine would be "Betweenness and betweenness"? That's
> useless. I'd need to rename it "weighted vs unweighted". I don't see a rename on it.

## 8. Things that tripped him along the way

> The same betweenness result looks different depending on where I open it. Once it's a card
> floating on the graph with Scope and Weight dropdowns. Once it's the right-hand panel with Options
> at the bottom and "Compare with..." at the bottom. Once it's the right-hand panel with "Compare
> with..." as a big button at the top and a refresh icon I don't know the meaning of. Pick one. I
> kept looking in the wrong spot for "Compare with...".

> The engine line says WebGPU on one and CPU on the other, for the same result. I don't care which,
> but if they're different runs I'd want to know that's not the "one thing" that changed.

---

## Answers

**Single Ease Question (1 very difficult to 7 very easy): 4.**

> The comparing bit is a 6. Getting to it is a 3. Finding which of yesterday's things was "the
> ranking", figuring out which of two weight controls to touch, and not knowing whether "value"
> means closer or further -- that's where the time went. And the runs are labelled by how long they
> took instead of what's different about them.

**Would you use this instead of your current tool?**

> For this job, probably yes. Right now I'd rerun it in NetworkX, merge two dataframes on the name,
> rank both, diff the ranks, and write the "how" from memory. That's twenty minutes and I always get
> the ties wrong. This gives me top-N overlap, who moved, and a written record of each run with a
> copy button. That's better than what I do. But the first time, I'd check the weighted top five
> against NetworkX, because I don't trust any tool on which way round the weight goes until I've
> seen it match.

---

## Observed problems

1. **Runs carry no date and no settings label** (results panel, Runs). "Run 1, 1.2 s, shown" names
   the duration, not what differs. "Yesterday's" ranking could not be picked out by time, and two
   runs of the same measure could not be told apart by name. Severity: high for this task.
2. **Two weight controls on one result** (results panel): "Weight: value, not used yet. Change..."
   at the top and "Weight: None for this run" under Options. He could not tell which one changes
   only the new run and which one changes the project, and the out-of-date screen made him afraid of
   the second.
3. **The weight's direction is not shown at the point of choosing** (results panel options, run
   and read). He did not know whether "value" would be read as a stronger tie or a longer road. The
   words "used as similarity" and "used as a distance" exist on other screens, after the fact.
4. **Comparing two runs of one measure on one graph is never shown** (comparison). The examples are
   two measures or two datasets; he had to assume his earlier run would be in the picker.
5. **Results list did not show the ranking** (navigation, Les Miserables at rest). Only "Bridges"
   was listed; the ranking was found through the table's column header instead.
6. **A saved comparison names itself after the two measures** (comparison, saved). For two runs of
   betweenness that name is useless, and no rename was visible.
7. **One result, three layouts** (run and read, results panel, inspector). "Compare with..." moved
   between the bottom and the top, and a refresh icon appeared unexplained.
8. **"How each was made" takes two copies** (run record). He wanted one copy on the comparison
   carrying both records and the agreement line.

## What worked for him

- The column header "Betweenness exact, unweighted, full graph" in the table: how the numbers were
  made, on the numbers.
- "Runs 2 ... Run 1 shown": a rerun keeps the earlier run instead of overwriting it.
- "Options wait for Run": changing an option does not start anything by itself.
- The agreement line ("49 of the top 50 in both") and the Moved list: sentences and a table he can
  send.
- Spearman stated with and without the tied-at-zero nodes, and "About Spearman" in two lines.
- The run record with Copy: method, normalization, weight conversion and scope, in words.
- "Export table as CSV" on the comparison.
