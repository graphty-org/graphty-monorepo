# Session: a costly measure on a large graph -- Chris, ML engineer (recommendation systems)

**Task, as the moderator gave it:** "Measure who bridges groups on the whole citation graph."

**Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
`study/personas/ml-engineer-recsys.md`). 1440 x 900 laptop screen; dark mode where the page
offers it. He last did this task on an earlier version of the mocks and rated it 5.

**Screens used, in the order the task gives them:** the measure options with cost, running
within the time limit and then with a 500-source edit held (`screens/option-form-cost.html`);
the Results panel, the refused exact run and the finished sampled run with its run record
(`screens/results-panel.html`); the graph past its drawing limit with the Nodes table
(`screens/past-drawing-limit.html`).
Renders: `shots/tasks/costly-measure/01` to `05`; the dark finished result he also looked at
is `tmp/chris-costly-r6/fs-dark.png`.

## Transcript (think-aloud)

**Opening: the options card, already running.**

> Patent citations again. 124,318 nodes, 1,480,221 edges, directed, average total degree 23.8.
> Canvas empty, "124,318 nodes not drawn". Still the right call.

> "Who bridges groups." Same as last time -- nobody defines the groups, so I'm translating it to
> betweenness myself. Somebody already picked "Betweenness (sampled)" for me here. Fine, that's
> what I'd have picked.

> Running, "under a minute, within the time limit. Directed." There's a progress bar at the top
> of the card and another one in the toast at the bottom. Two bars, zero numbers. I'd still like
> "sources done 40 / 101". It's under a minute so I'll let it slide.

> The blue button at the top of this card is Cancel. The primary button on a running job is
> Cancel? That reads like the thing it wants me to press. Minor.

> Direction: "As the graph: directed." OK. Sample size 101 of 124,318, "the largest sample that
> fits the time limit." Seed 7, and a reroll icon. Good -- that's the reproducibility I asked for.

> Hover on the sample size info: "101 source nodes drawn at random, seed 7." Drawn at random how?
> Uniform over nodes? On a citation graph with hubs that matters for the variance. Still not said.

**Second state: I typed 500.**

> "500 sources take a few minutes, past the 30-second time limit. Run starts it in the
> background. 101 is the largest that fits." That's exactly what I wanted last time -- I can ask
> for the bigger sample and it just goes to the background instead of refusing. The old result
> stays and says "Edit held". Good. "A few minutes" -- 500 over 101 times 30 seconds is about two
> and a half, so the words are at least consistent with the math.

**Third state: the refused exact run.**

> "Betweenness, exact. Not run: would take about 10 hours. The time limit is 30 seconds." A
> number this time. Ten hours I can reason about; "hours" I couldn't. Down in the list the exact
> full-graph row still just says "hours", but the headline has the number, fine.

> "On the full graph, 124,318 nodes; the directed citations read as undirected."

> ...Wait. Read as undirected. The card I was just on said "Direction: As the graph: directed."
> So which is it? This is the exact thing that made me stop trusting it last time.

> Routes: "Sampled, 101 sources, under a minute" is preselected, "Run sampled" is the button.
> "Exact, on the 5,318 nodes in Drug patents granted in 2001. This is a different graph." Thank
> you for saying that in bold -- it's not what I was asked, skip. Past the limit: exact on the
> full graph, hours.

> It says "Not run" and it's still sitting there as a thing I opened -- it didn't pretend to
> start and spin forever. That's the honest version. I'd want to know it's kept somewhere, like
> in the list of runs, so I can say later "I asked for exact and it said 10 hours". I didn't see
> it in the runs list on the next screen. Maybe it's on the Results list one level up. I'm not
> going looking.

> Also: this one is "Betweenness, exact" and the other is "Betweenness (sampled)". Are those two
> measures or one measure with a method option? In my head it's one function with a `k`
> argument.

**Fourth state: the finished sampled result.**

> "Betweenness (sampled), 101 sources, Sep 28 09:52." Status: full graph, 124,318 nodes.
> Sampled, 101 sources. Directed. WebGPU. Weight: no numeric edge column. Good -- the
> denominator is right there, the weights question is answered before I ask.

> Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, then three rows of "#3-#7". "Ranks below
> #2 may swap between runs." Still the best thing on the screen. Ids are plain now, no commas.
> The column header "rank, low-high" I had to read twice -- I think it means the rank range --
> but the rows make it obvious.

> "Runs of this measure 1. Run 1, 101 sources, Sep 28 09:52, shown." And "Re-run (keeps Run 1)",
> greyed out because nothing changed. OK, that's how I'd want it: a re-run doesn't clobber the
> last one, and there's a "Compare with..." for when I've got the 500-source run. That's
> actually useful -- I'd check the top-20 overlap between 101 and 500 sources before believing
> either.

> Distribution: "zero ~79,554 nodes." Same question as last time. True zero, or no sampled path
> went through them? On a citation DAG read as directed, lots of leaves really are zero. Read as
> undirected, a lot fewer should be. Which brings me back to the direction.

> Details. Run record. Method: Brandes from 101 random sources, scaled up by 124,318 / 101.
> Seed 7. Error bound plus or minus 0.00035, 95 in 100. "Took 29.9 s." There's my timing. Good --
> though it's buried in the record; the status line still just says "WebGPU." with no number.
> And 29.9 against a 30-second limit is cutting it close; what happens on a slower laptop, does
> it get cut off at 30 and give me a partial?

> "Direction: Citations read as undirected." Normalization: "the node pairs of an undirected
> graph." And ten centimetres to the left: "Directed." And under Options: "Direction:
> Directed." Same contradiction as last time. The only change is that the refusal now agrees
> with the record and the form and the panel still don't. So three places say directed, two
> say undirected.

> If I had to bet, it computed undirected -- the record is the most detailed and the refusal
> agreed with it -- and "Directed" in the panel is describing the graph, not the run. But I'm
> betting. On a citation graph directed vs undirected betweenness is a different ranking, not a
> rounding difference. That's the whole answer.

> Side note: I'm in dark mode. The left panel went dark, the canvas and the right-hand panel
> stayed white. That's a flashbang at 11pm.

**Fifth state: the graph past its drawing limit, with the table.**

> "124,318 nodes not drawn. More than this browser draws at once (50,000)." Narrow the graph.
> The stats on the right are good: isolates 2,406, weak components 3,912, the big one is
> 116,905 nodes at 94.0%, an in-degree distribution on log-log axes, 41,873 never cited. That's
> the whole-graph shape I actually want. Honestly that panel is worth more to me than the
> betweenness.

> The table is sorted by citationsReceived. I clicked "124,313 more in the table" expecting it
> sorted by the betweenness estimate, with the estimate as a column. I don't see a betweenness
> column here at all. Maybe this is just the table before the run. Either way I can't confirm
> the column lands in the table with the original patent ids -- which is the only thing I'd
> actually take away: dump id + estimate, join in the notebook, done. The ids at least look
> like strings now, no commas.

> There's a "Keep top rows..." and a "..." menu. If Keep top rows let me keep the top 200 by
> betweenness and draw them with their edges, that's the bridge picture I wanted last time.
> Nothing here says it can, and nothing on the result offers "draw the neighbourhood of #1".

> The graph is called "Patent citations" on the left, "Citations 1999 to 2001" on the right on
> one screen, and "Citations" on another. Small thing, but I'd wonder whether I'm on the same
> graph.

**Done.**

> Answer: 5879702 is the bridge by a wide margin, #3 through #7 are a coin flip. Mechanically,
> easier than last time -- the bigger sample goes to the background, the refusal has a real
> number, the timing exists, ids are clean, runs are kept. But I still can't tell you whether
> that ranking is directed or undirected, and I'd rerun it in NetworKit before I said it to
> anyone.

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 5

> Clicking through it is a 6, maybe a 6.5 now -- the background run and the kept runs are the
> kind of thing I'd build myself. I'm keeping it at 5 because the one correctness question I
> always ask first -- what did it actually compute -- still gets two answers. You fixed the
> refusal to say "read as undirected" and left "Directed" on the form, the status line and the
> options. If anything that's worse: now I know it's undirected in one place and I'm told
> directed in three.

**Would you use this instead of your current tool?**

> Not instead. Next to it, as the first look. What it does that my notebook doesn't: tells me
> the cost before I start, tells me 10 hours instead of letting me find out, runs the bigger
> sample in the background, keeps the old run, and tells me which ranks are noise. The
> whole-graph statistics panel -- components, isolates, log-log degree -- I'd open the tool for
> that alone. To use it and skip the notebook: one direction everywhere, the timing on the
> status line, and the estimate as a column in the table I can export with the original ids.

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Measure options, Results panel finished sampled, run record | The options card ("As the graph: directed"), the result status line ("Directed") and the Options section ("Direction: Directed") disagree with the run record ("Citations read as undirected", undirected normalization) and the refusal ("the directed citations read as undirected"). The participant could not tell which ranking he was reading; unresolved since the earlier round. | 4 |
| Graph past its drawing limit, Nodes table | After "124,313 more in the table" the table shown is sorted by citationsReceived and has no betweenness column; he could not confirm the estimate lands in the table or the export beside the original ids. | 3 |
| Results panel, finished sampled (dark) | In dark mode only the left panel turns dark; the canvas and the right-hand panel stay white. | 2 |
| Results panel, refused vs finished | The refused exact run is named "Betweenness, exact" and the finished one "Betweenness (sampled)"; he reads them as one measure with a method option. The refused run does not appear under "Runs of this measure", so he did not know whether the "Not run" record is kept anywhere. | 2 |
| Results panel, finished sampled | Elapsed time (29.9 s) is only in the run record; the status line still shows "WebGPU." with no number. 29.9 s against a 30-second limit made him ask what happens on a slower machine. | 2 |
| Measure options, running | Two progress bars (card and toast) with no counts; the primary (blue) button on the running card is Cancel. | 2 |
| Measure options, sample size tip | "Drawn at random" does not say uniform over nodes or degree-weighted. | 2 |
| Results panel, finished sampled | "zero ~79,554 nodes" still does not say true zero vs no sampled path passing through. | 2 |
| Graph past its drawing limit | No visible way to draw the top of the betweenness ranking or the neighbourhood of the #1 node; "Keep top rows..." does not say whether it could. | 2 |
| Across screens | The same graph is titled "Patent citations", "Citations 1999 to 2001" and "Citations". | 1 |
| Results panel, finished sampled | Column header "rank, low-high" needed a second read. | 1 |

## What worked for him

- Typing 500 sources gives the cost in words consistent with the math and runs it in the
  background, keeping the finished 101-source result as "Edit held".
- The refusal gives a number ("about 10 hours"), preselects the sampled route, and says in bold
  that the 5,318-node exact route is a different graph.
- "Not run" is shown as a state, not a spinner that never ends.
- Rank ranges ("#3-#7") and "Ranks below #2 may swap between runs".
- Runs are kept: "Re-run (keeps Run 1)" and "Compare with..." for checking top-k overlap
  between sample sizes.
- Patent ids shown as plain strings everywhere.
- The run record has a real elapsed time, seed, method and error bound.
- The whole-graph statistics panel: isolates, weak component sizes, log-log in-degree
  distribution, count never cited.
