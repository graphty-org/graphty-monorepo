# Session: a graph too big to draw -- Chris, ML engineer (recommendations)

- **Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
  ../../personas/ml-engineer-recsys.md). Lives in notebooks; has given up on Gephi before.
- **Task as given by the moderator:** "Here is last period's citation data. Find anything worth a
  closer look."
- **Screens used, in order:** the patent citation file past the drawing limit (not drawn, the
  filter popover, the rule editor, narrowed and drawn, the offered sample, the no-WebGPU case),
  then Find (including Find on the undrawn citation graph), then the filter chip and its steps.
- **Screen size:** 1440 x 900, laptop.

## Transcript (think-aloud)

**1. The file opens.**

> OK. Patent citations. Not my data, but it's a directed graph, citing patent to cited patent, so
> it's basically a user-item graph where the items are also users. Fine.
>
> First thing -- it didn't try to draw it. Good. "124,318 nodes not drawn: more than this browser
> draws at once (50,000). Narrow the graph..." That's honest. Every other tool I've opened would
> have started a force layout on 1.4 million edges and frozen the tab. I'll take a blank canvas
> with a reason over a hairball.
>
> Right side, Statistics. 124,318 nodes, 1,480,221 edges, density 0.0000958, average degree 23.8,
> 2,406 isolates, 3,912 components, the big one is 116,905 nodes, 94.0%. OK, these are the numbers
> I'd compute first in a notebook anyway. Let me check the average degree... 2 x 1,480,221 /
> 124,318 is 23.8. Right, so that's total degree, in plus out. Fine, but it should say that on a
> directed graph.
>
> Isolates 2,406. In a citation graph, a patent with zero edges in either direction -- that's the
> cold-start bucket. That's actually the first thing "worth a closer look". Can I click "isolates"
> and get those 2,406 rows? It's just a number. Nothing says it's clickable.
>
> What I actually want here is the degree distribution. In and out separately, log axes. How
> concentrated are citations on the top 1%? There's no histogram. There's a components list,
> which is nice, but no degree plot. That's the one chart I'd open a notebook for.
>
> The table's useful though. Sorted by citationsReceived, top is 6,117,075 with 779. id, grantYear
> 1999 to 2001, category, six values. And the ids are the patent numbers -- it kept my ids. That
> matters a lot to me.
>
> "Last period" -- the moderator said last period. grantYear is 1999 to 2001. Is that the period?
> I don't see a time filter anywhere. I'll assume the file IS the period.

**2. Narrow the graph...**

> Clicking "Narrow the graph...". Filter steps popover. "No filter steps. Every number reads the
> full graph." Good -- it tells me the denominator. Suggested: "Top 3 by degree, with neighbors --
> a sample: favors hubs -- 586". OK, it at least admits it's a biased sample. I like that it
> labels it. Top 3 by degree though -- in-degree or total? On a citation graph those are very
> different questions. "Most cited" versus "cites and is cited a lot."
>
> I'm not taking the suggestion. I'll write my own rule. "Add step."

**3. The rule editor.**

> Keep Nodes. Where category is Drugs and medical, AND citationsReceived >= 25. Scope: "Full
> graph, no steps above." And at the bottom, before I commit: "612 nodes, 1,843 edges will draw."
> Oh, that's nice. That's the thing I actually want from a filter -- the count before I run it,
> not after. No round trip.
>
> Wait -- the suggestion said 586 and this says 612. Different rules, fine, not the same thing.
> Moving on. "Filter to."

**4. Narrowed and drawn.**

> It drew. Toast: "Filtered to 612 of 124,318 nodes. Undo." Chip says "Filtered: 612 of 124K
> nodes, 1 step." Statistics now: nodes 612, edges "1,843 of 1,480,221", density 0.00493, average
> degree 6.0, 31 isolates, 44 components, 545 nodes in the big one.
>
> Small thing: edges says "of 1,480,221" but nodes just says 612. Why does one carry the
> denominator and the other doesn't? The chip has it, so I can live with it, but be consistent.
>
> 31 isolates in the filtered set -- highly cited drug patents whose citations all come from
> outside drugs-and-medical. That's actually interesting. Those are the cross-domain ones. That's
> a "closer look" candidate.
>
> The drawing itself... it's the hairball. A smaller hairball. Grey blob in the middle with ids on
> top of each other. On the right a grid of the 43 little components -- that's more useful than
> the blob, honestly. I'd want to click one of those and see what it is.
>
> ForceAtlas2, "Engine: WebGPU", Run layout. Is this already laid out or not? And how long did it
> take? A "WebGPU" label with no time on it is a badge. Tell me "0.4 s on GPU" and I'd believe it.

**5. The offered sample instead.**

> Let me see what the sample does, for comparison. "Sample: 586 of 124K nodes, 1 step." Three
> big stars -- 6,117,075, 6,031,111, 5,960,121 -- and their neighbours, with a few patents
> bridging between them. The statistics panel says, in a grey box, "Describes a sample: top 3 by
> degree, with neighbors. It favors hubs, so density and clustering read high." And density has a
> little tag, "sample, reads high."
>
> OK, that's -- honestly, that's the right thing to do. I've been burned by dashboards that show
> a sampled number as if it were exact. This one tells me. Components 1, isolates 0 -- well, yes,
> by construction, it's a star around three hubs. Which is exactly why I wouldn't use it for
> anything except "what do the hubs' neighbourhoods look like".
>
> The bridging nodes -- 6,018,952, 5,907,468, 6,112,268 -- patents that cite two of the three
> most-cited patents. That's the co-citation thing. That's worth a closer look. In my world
> that's the item that two popular items both pull in.

**6. The no-WebGPU case.**

> Same filter, laptop without WebGPU. "ForceAtlas2 on the CPU: this browser has no WebGPU." No
> scary banner. Fine, good.
>
> But hold on. Same filter -- "Filtered: 612 of 124,318 nodes" -- and here edges are 1,904, and
> components is 1. On the other screen the same 612 nodes had 1,843 edges and 44 components.
> The engine shouldn't change the edge count. Either it's a different filter or somebody's numbers
> are wrong. If I saw this in a real tool I'd stop trusting every number in that panel. That's the
> kind of thing I check first.
>
> Also this one doesn't have "of 1,480,221" on edges. And it has max degree 92, which the other
> one didn't. Pick one statistics panel.

**7. Find -- search for specific patents.**

> Now what I'd really do: go look at specific nodes. The Find screens are mostly on a Les
> Miserables graph -- I don't care about Les Mis, but fine, it's a demo. Let me find the one on
> the citation data.
>
> Here: I pasted three ids -- "6,117,075 6,231,106 6,287,586" -- and it says "3 results in all
> 124,318 nodes". It searched the full graph even though nothing is drawn. Pasting a list of ids is
> exactly my workflow -- I'd paste the ids from a notebook cell. That's good.
>
> Inspector for 6,117,075: "Not drawn: the graph is past the drawing limit. Counted everywhere."
> grantYear 2000, category Drugs and medical, citationsReceived 779. Where's the out-degree? How
> many patents does IT cite? Where are its edges? I can see its row, not its neighbourhood.
>
> There's a "Select neighbors" button with a dropdown, and "Filter to". What I want is: this
> patent, 2 hops, filter to that, draw it. I think that's Select neighbors -> options -> 2 hops,
> then Filter to? I'm guessing. Nothing on this screen tells me whether Select neighbors even
> works when the node isn't drawn, or how many nodes 2 hops would be before I commit. The rule
> editor told me the count up front; this doesn't. And a 2-hop neighbourhood of a patent with 779
> citations could be 20,000 nodes easily.
>
> On the Les Mis screens: search "ma", 14 results, and the ones outside the filter say which step
> removed them -- "Filtered out by 'Filter to degree >= 5'". That's nice. I'd like that for my
> patents: "this id exists, your filter hid it."
>
> Typed "betweenness" into Find and it offered "Run Betweenness centrality..." as a command. And
> the lightning thing lists centralities with a one-line meaning each -- "who sits between
> groups", "where a random walk spends most time". I'd want the formula, not a slogan, but it's
> better than an unlabeled "Analyze" button. No link prediction in there, no Adamic-Adar, no common
> neighbours. That's what I'd reach for on a co-citation question.

**8. The filter chip and its steps.**

> The chip popover with three steps -- Filter to Largest component 76, Filter to degree >= 5
> 41, Filter out group = 8 28. Running count after each step. Checkboxes to turn a step off. This
> is the right shape -- it's a pipeline, like a chain of DataFrame filters, and it shows the row
> count after each stage. I get that immediately.
>
> "degree" and "degree on: full graph" as two columns in the table -- good, because filtered
> degree and real degree are different numbers and most tools silently swap one for the other.
>
> What I'd want next: export the filtered set. There's an Export... button top right. I didn't see
> what it produces. If it's CSV with my patent ids I'm happy. If it's a PNG I'm not.

**9. Wrap-up: what's worth a closer look?**

> What I'd report back: (1) 2,406 isolates -- cold patents, zero citations either way, check if
> that's real or a join problem; (2) the small components, 41, 23, 19 nodes -- probably patent
> families or a data artefact, worth a look; (3) within drugs-and-medical, 31 highly cited patents
> with no in-domain edges -- cross-domain; (4) the patents that bridge the top three hubs. I got
> (1) and (2) from the statistics panel, but I couldn't click through to either. I got (3) from a
> filter I wrote. I got (4) from the sample. I did not get the degree distribution, which is what
> I'd actually open first.

## Single Ease Question

**5 of 7.** "Getting a count before I commit, and not freezing on a big file -- easy. Getting from
a number in Statistics to the rows behind it, or from one patent to its neighbourhood, I had to
guess."

## Would he use it instead of his current tool?

> Not instead of the notebook. Beside it, maybe. The things it does that I can't do in 15 lines
> of networkx: count before I filter, show the pipeline of filters with a count after each, keep
> my ids, and admit when something is a sample. The two things that would make me actually open
> it: click "2,406 isolates" or "41 nodes" and get those rows, and a k-hop neighbourhood of one id
> with the size shown before it draws. And if the edge count changes depending on whether I have
> WebGPU, I'm out -- I'd need to know that was a mock bug.

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Past the drawing limit, no-WebGPU state | The same filter (612 nodes) shows 1,904 edges and 1 component, where the WebGPU state shows 1,843 edges and 44 components. Read as the engine changing the answer. | 4 |
| Past the drawing limit, not drawn | Statistics has isolates and component sizes, but no way to open the nodes behind a number (the 2,406 isolates, the 41-node component). | 3 |
| Find, past the drawing limit | Found a patent by id, but no visible way to get its k-hop neighbourhood with a count before drawing; unclear whether Select neighbors works on an undrawn node. Inspector shows no in/out degree. | 3 |
| Past the drawing limit, not drawn | No degree distribution (in and out, log axes) -- the first thing he looks at on a big graph. | 3 |
| Past the drawing limit, narrowed | Filtered drawing is still a dense blob with overlapping id labels; the grid of small components beside it was more informative. | 2 |
| Past the drawing limit, narrowed | "Engine: WebGPU" with no timing reads as a badge. | 2 |
| Filter popover, suggested step | "Top 3 by degree" does not say in-degree, out-degree or total on a directed graph; average degree 23.8 is total degree, also unstated. | 2 |
| Statistics, narrowed | Edges carry "of 1,480,221" but nodes do not; the CPU state drops the denominator altogether. | 2 |
| Past the drawing limit | Task said "last period"; no time filter or window control is visible. | 2 |
| Quick actions | Centrality list has plain-word meanings but no formulas and no link-prediction heuristics (common neighbours, Adamic-Adar). | 1 |
